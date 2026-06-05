import { emailButton, emailLayout, emailNotice, emailParagraph } from './layout.js'

export function projectTeamMemberEmail(params: {
  userName: string
  projectName: string
  projectUrl: string
  addedByName: string
  roleLabel?: string
}) {
  const role = params.roleLabel?.trim()
  const subject = `Te agregaron al proyecto «${params.projectName}»`
  const text = `Hola ${params.userName},

${params.addedByName} te agregó al equipo del proyecto «${params.projectName}» en Kora CRM${role ? ` como ${role}` : ''}.

Abre el proyecto aquí:
${params.projectUrl}

— Kora CRM`

  const html = emailLayout({
    title: 'Nuevo acceso a proyecto',
    subtitle: params.projectName,
    preheader: `Te agregaron al equipo del proyecto ${params.projectName}.`,
    bodyHtml: `
      ${emailParagraph(`Hola <strong>${params.userName}</strong>,`)}
      ${emailParagraph(
        `<strong>${params.addedByName}</strong> te agregó al equipo del proyecto <strong>${params.projectName}</strong>${role ? ` (<em>${role}</em>)` : ''}. Ya puedes verlo en <strong>Mis proyectos</strong> y trabajar en su plan de trabajo.`,
      )}
      ${emailButton(params.projectUrl, 'Abrir proyecto')}
      ${emailNotice('Si no esperabas este acceso, contacta a tu administrador o al gerente del proyecto.')}
    `,
  })

  return { subject, text, html, category: 'Project Team' }
}
