import { emailButton, emailLayout, emailNotice, emailParagraph, emailStepsList } from './layout.js'

export function accountSetupEmail(params: {
  userName: string
  activateUrl: string
  expiresHours: number
}) {
  const subject = `Bienvenido/a a Kora — activa tu cuenta`
  const text = `Hola ${params.userName},

Te damos la bienvenida a Kora CRM. Tu cuenta fue creada y está pendiente de activación.

Para elegir tu contraseña y configurar tu pregunta de seguridad, abre este enlace (válido ${params.expiresHours} horas):
${params.activateUrl}

Si no solicitaste este acceso, ignora este mensaje.

— Equipo Kora`

  const html = emailLayout({
    title: 'Bienvenido/a a Kora',
    subtitle: 'Activa tu cuenta y empieza a trabajar con tu equipo.',
    preheader: 'Activa tu cuenta y configura tu acceso seguro.',
    bodyHtml: `
      ${emailParagraph(`Hola <strong>${params.userName}</strong>,`)}
      ${emailParagraph(
        'Tu cuenta en <strong>Kora CRM</strong> está lista. Solo falta un paso para empezar a gestionar contactos, oportunidades y actividades con tu equipo.',
      )}
      ${emailStepsList([
        'Define tu contraseña personal',
        'Elige una pregunta de seguridad (recuperación de acceso)',
        'Activa tu perfil — de <strong>Por verificar</strong> a <strong>Activo</strong>',
      ])}
      ${emailButton(params.activateUrl, 'Activar mi cuenta')}
      ${emailNotice(
        `El enlace caduca en <strong>${params.expiresHours} horas</strong>. Si expira, pide a un administrador que reenvíe la invitación.`,
      )}
    `,
  })

  return { subject, text, html, category: 'Account Setup' }
}
