import { emailButton, emailLayout, emailNotice, emailParagraph } from './layout.js'

export function tenantAccessGrantedEmail(params: {
  userName: string
  tenantName: string
  profileName: string
  loginUrl: string
  centralLoginUrl: string
  accountInactive?: boolean
}) {
  const inactiveNote = params.accountInactive
    ? '\n\nTu cuenta global está inactiva. Pide a un administrador que la reactive antes de iniciar sesión.'
    : ''
  const subject = `[Kora CRM] Acceso a ${params.tenantName}`
  const text = `Hola ${params.userName},

Te agregamos a ${params.tenantName} en Kora CRM con el perfil «${params.profileName}».

Entra con tu correo y contraseña actuales:
${params.loginUrl}

También puedes iniciar sesión en ${params.centralLoginUrl} y elegir ${params.tenantName}.${inactiveNote}

Si no esperabas este acceso, contacta al administrador de tu empresa.

— Equipo Kora`

  const html = emailLayout({
    title: `Acceso a ${params.tenantName}`,
    subtitle: params.accountInactive
      ? 'Tu acceso a esta instancia está listo; la cuenta global debe estar activa.'
      : 'Ya puedes entrar con tu cuenta existente.',
    preheader: `Te agregamos a ${params.tenantName} en Kora CRM.`,
    bodyHtml: `
      ${emailParagraph(`Hola <strong>${params.userName}</strong>,`)}
      ${emailParagraph(
        `Un administrador te agregó a <strong>${params.tenantName}</strong> en <strong>Kora CRM</strong> con el perfil <strong>${params.profileName}</strong>.`,
      )}
      ${
        params.accountInactive
          ? emailNotice(
              'Tu cuenta global está <strong>inactiva</strong>. Un administrador debe reactivarla antes de que puedas iniciar sesión.',
            )
          : emailParagraph(
              'Como ya tienes cuenta activa, usa el mismo correo y contraseña que en tus otras instancias. No necesitas activar nada nuevo.',
            )
      }
      ${emailButton(params.loginUrl, `Entrar a ${params.tenantName}`)}
      ${emailNotice(
        `También puedes ir a <a href="${params.centralLoginUrl}">${params.centralLoginUrl}</a> e iniciar sesión eligiendo <strong>${params.tenantName}</strong>.`,
      )}
    `,
  })

  return { subject, text, html, category: 'tenant_access_granted' }
}
