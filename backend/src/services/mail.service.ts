import nodemailer from 'nodemailer'
import { MailtrapTransport } from 'mailtrap'

import { env } from '../config/env.js'
import { KORA_EMAIL_LOGO_CID, resolveKoraEmailLogoPath } from '../emails/brand.js'

export type SendMailInput = {
  to: string
  subject: string
  text: string
  html: string
  category?: string
}

let transport: nodemailer.Transporter | null = null

function isMailConfigured(): boolean {
  if (!env.mailEnabled) return false
  if (env.mailSmtpUser && env.mailSmtpPass) return true
  if (env.mailtrapToken.trim()) return true
  return false
}

function getTransport(): nodemailer.Transporter | null {
  if (!isMailConfigured()) return null
  if (!transport) {
    if (env.mailtrapToken.trim()) {
      transport = nodemailer.createTransport(
        MailtrapTransport({
          token: env.mailtrapToken,
        }),
      )
      console.info('[mail] transporte Mailtrap API (Sending)')
    } else if (env.mailSmtpUser && env.mailSmtpPass) {
      transport = nodemailer.createTransport({
        host: env.mailSmtpHost,
        port: env.mailSmtpPort,
        auth: {
          user: env.mailSmtpUser,
          pass: env.mailSmtpPass,
        },
      })
      console.info('[mail] transporte SMTP Mailtrap Sandbox:', env.mailSmtpHost)
    }
  }
  return transport
}

export async function sendMail(input: SendMailInput): Promise<boolean> {
  const tx = getTransport()
  if (!tx) {
    console.warn(
      '[mail] envío omitido (MAIL_ENABLED=false o sin credenciales SMTP/API):',
      input.subject,
      '→',
      input.to,
    )
    return false
  }

  const override = env.mailOverrideTo
  const useOverride =
    Boolean(override) && override.toLowerCase() !== input.to.toLowerCase()

  const to = useOverride ? override : input.to
  const subject = useOverride ? `[DEV → ${input.to}] ${input.subject}` : input.subject
  const text = useOverride
    ? `${input.text}\n\n---\n[Modo prueba] Destinatario real: ${input.to}\n`
    : input.text
  const html = useOverride
    ? `${input.html}<p style="margin:16px 0 0;padding:12px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;"><strong>Modo prueba:</strong> destinatario real: <code>${input.to}</code>.</p>`
    : input.html

  try {
    const logoPath = resolveKoraEmailLogoPath()
    const attachments =
      logoPath && input.html.includes(`cid:${KORA_EMAIL_LOGO_CID}`)
        ? [
            {
              filename: 'logo_kora_limpio.png',
              path: logoPath,
              cid: KORA_EMAIL_LOGO_CID,
            },
          ]
        : undefined

    const mailOptions: nodemailer.SendMailOptions & { category?: string } = {
      from: { address: env.mailFromAddress, name: env.mailFromName },
      to: [to],
      subject,
      text,
      html,
      attachments,
    }
    if (input.category) mailOptions.category = input.category
    await tx.sendMail(mailOptions)
    if (useOverride) {
      console.info('[mail] redirigido a MAIL_OVERRIDE_TO:', to, '(destino real:', input.to, ')')
    }
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mail] error al enviar a', input.to, ':', message)
    return false
  }
}
