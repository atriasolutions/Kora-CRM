import { emailButton, emailLayout, emailNotice, emailParagraph } from './layout.js'

export function solicitudTeamMemberEmail(params: {
  userName: string
  solicitudTitle: string
  solicitudUrl: string
  addedByName: string
  roleLabel?: string
}) {
  const role = params.roleLabel?.trim()
  const subject = `Te agregaron a la solicitud «${params.solicitudTitle}»`
  const text = `Hola ${params.userName},

${params.addedByName} te agregó al equipo de la solicitud «${params.solicitudTitle}» en Kora CRM${role ? ` como ${role}` : ''}.

Abre la solicitud aquí:
${params.solicitudUrl}

— Kora CRM`

  const html = emailLayout({
    title: 'Nuevo acceso a solicitud',
    subtitle: params.solicitudTitle,
    preheader: `Te agregaron al equipo de la solicitud ${params.solicitudTitle}.`,
    bodyHtml: `
      ${emailParagraph(`Hola <strong>${params.userName}</strong>,`)}
      ${emailParagraph(
        `<strong>${params.addedByName}</strong> te agregó al equipo de la solicitud <strong>${params.solicitudTitle}</strong>${role ? ` (<em>${role}</em>)` : ''}. Ya puedes verla en <strong>Mis solicitudes</strong>.`,
      )}
      ${emailButton(params.solicitudUrl, 'Abrir solicitud')}
      ${emailNotice('Si no esperabas este acceso, contacta a tu administrador o al responsable de la solicitud.')}
    `,
  })

  return { subject, text, html, category: 'Solicitud Team' }
}
