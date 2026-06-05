import { emailButton, emailLayout, emailNotice, emailParagraph } from './layout.js'

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
    subtitle: 'Crea una nueva contraseña para volver a acceder a tu cuenta.',
    preheader: 'Enlace para crear una nueva contraseña.',
    bodyHtml: `
      ${emailParagraph(`Hola <strong>${params.userName}</strong>,`)}
      ${emailParagraph(
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Kora CRM</strong>. Usa el botón siguiente para elegir una nueva.',
      )}
      ${emailButton(params.resetUrl, 'Restablecer contraseña')}
      ${emailNotice(
        `El enlace caduca en <strong>${params.expiresHours} horas</strong>.`,
      )}
      ${emailNotice(
        'Si <strong>no</strong> solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá vigente y nadie podrá cambiarla sin el enlace.',
        'warning',
      )}
    `,
  })

  return { subject, text, html, category: 'Password Reset' }
}
