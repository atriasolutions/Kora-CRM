import { emailButton, emailLayout } from './layout.js'

export function passwordResetEmail(params: {
  userName: string
  resetUrl: string
  expiresHours: number
}) {
  const subject = `Restablece tu contraseña en Kora`
  const text = `Hola ${params.userName},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Kora CRM.

Abre este enlace (válido ${params.expiresHours} horas):
${params.resetUrl}

Si no solicitaste el cambio, ignora este correo; tu contraseña actual seguirá vigente.

— Equipo Kora`

  const html = emailLayout({
    title: 'Restablecer contraseña',
    preheader: 'Enlace para crear una nueva contraseña.',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hola <strong>${params.userName}</strong>,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Solicitaste restablecer tu contraseña. Usa el botón siguiente para elegir una nueva.
      </p>
      ${emailButton(params.resetUrl, 'Restablecer contraseña')}
      <p style="margin:0;font-size:13px;color:#64748b;">El enlace caduca en <strong>${params.expiresHours} horas</strong>.</p>
    `,
  })

  return { subject, text, html, category: 'Password Reset' }
}
