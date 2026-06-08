import { emailButton, emailLayout, emailNotice, emailParagraph } from './layout.js'

export function trialProvisionedEmail(params: {
  userName: string
  companyName: string
  loginUrl: string
  trialDays: number
  needsActivation: boolean
  activateUrl?: string
}) {
  const subject = `[Kora CRM] Tu demo está lista — ${params.companyName}`
  const activationBlock = params.needsActivation && params.activateUrl
    ? `

Antes de entrar, activa tu cuenta (elige contraseña y pregunta de seguridad):
${params.activateUrl}
`
    : ''

  const text = `Hola ${params.userName},

Tu espacio de prueba de Kora CRM para ${params.companyName} ya está listo.

Accede aquí: ${params.loginUrl}
${activationBlock}
Tienes ${params.trialDays} días para explorar el CRM.

Si necesitas ayuda, responde a este correo o escríbenos por la web.

— Equipo Kora`

  const html = emailLayout({
    title: 'Tu demo de Kora está lista',
    subtitle: `${params.companyName} · ${params.trialDays} días de prueba`,
    preheader: `Entra a ${params.loginUrl}`,
    bodyHtml: `
      ${emailParagraph(`Hola <strong>${params.userName}</strong>,`)}
      ${emailParagraph(
        `Tu espacio de prueba de <strong>Kora CRM</strong> para <strong>${params.companyName}</strong> ya está disponible.`,
      )}
      ${
        params.needsActivation && params.activateUrl
          ? `${emailParagraph('Primero activa tu cuenta (contraseña y pregunta de seguridad):')}
             ${emailButton(params.activateUrl, 'Activar mi cuenta')}`
          : ''
      }
      ${emailButton(params.loginUrl, 'Entrar a mi demo')}
      ${emailNotice(`Válido por <strong>${params.trialDays} días</strong>. Luego el espacio se suspende automáticamente.`)}
    `,
  })

  return { subject, text, html, category: 'trial_provisioned' }
}
