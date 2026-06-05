import { env } from '../config/env.js'
import { koraBrand, koraEmailLogoBlock, koraEmailLogoUrl } from './brand.js'

export function emailLayout(params: {
  title: string
  preheader: string
  bodyHtml: string
  /** Subtítulo bajo el título en el encabezado (opcional). */
  subtitle?: string
}): string {
  const year = new Date().getFullYear()
  const subtitle = params.subtitle
    ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.82);max-width:420px;">${params.subtitle}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;background:${koraBrand.canvas};font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:${koraBrand.ink};-webkit-font-smoothing:antialiased;">
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${params.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${koraBrand.canvas};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="height:4px;border-radius:4px 4px 0 0;background:${koraBrand.accentBar};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:${koraBrand.surface};border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.1),0 2px 8px rgba(15,23,42,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:${koraBrand.headerGradient};padding:36px 32px 32px;text-align:center;">
                    ${koraEmailLogoBlock(72, koraEmailLogoUrl(env.appPublicUrl))}
                    <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.65);">${env.mailFromName}</p>
                    <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.02em;">${params.title}</h1>
                    ${subtitle}
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 36px 8px;">
                    ${params.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 36px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${koraBrand.border};">
                      <tr>
                        <td style="padding-top:24px;">
                          <p style="margin:0;font-size:12px;line-height:1.65;color:${koraBrand.muted};">
                            Este mensaje fue enviado por <strong style="color:${koraBrand.slate};font-weight:600;">${env.mailFromName}</strong>.
                            Si no esperabas este correo, puedes ignorarlo con tranquilidad.
                          </p>
                          <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">© ${year} ${env.mailFromName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 8px 0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">CRM para equipos que venden con claridad</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
  <tr>
    <td align="center" style="border-radius:12px;background:${koraBrand.buttonGradient};box-shadow:0 6px 20px rgba(124,58,237,0.35);">
      <a href="${href}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">${label}</a>
    </td>
  </tr>
</table>
<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${koraBrand.muted};word-break:break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
<a href="${href}" style="color:${koraBrand.violet};font-weight:600;text-decoration:none;">${href}</a></p>`
}

/** Lista de pasos con icono de check. */
export function emailStepsList(items: string[]): string {
  const rows = items
    .map(
      (item) => `<tr>
    <td valign="top" width="28" style="padding:6px 0 10px;font-size:15px;line-height:1;color:${koraBrand.cyan};">✓</td>
    <td style="padding:6px 0 10px;font-size:14px;line-height:1.55;color:${koraBrand.slate};">${item}</td>
  </tr>`,
    )
    .join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f8fafc;border:1px solid ${koraBrand.border};border-radius:12px;">
  <tr>
    <td style="padding:14px 18px 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${rows}
      </table>
    </td>
  </tr>
</table>`
}

/** Aviso destacado (caducidad, seguridad, etc.). */
export function emailNotice(html: string, tone: 'info' | 'warning' = 'info'): string {
  const bg = tone === 'warning' ? '#fffbeb' : '#f0f9ff'
  const border = tone === 'warning' ? '#f59e0b' : koraBrand.cyan
  const text = tone === 'warning' ? '#92400e' : '#0c4a6e'

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-left:4px solid ${border};background:${bg};border-radius:0 10px 10px 0;">
  <tr>
    <td style="padding:14px 18px;font-size:13px;line-height:1.6;color:${text};">${html}</td>
  </tr>
</table>`
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${koraBrand.slate};">${html}</p>`
}
