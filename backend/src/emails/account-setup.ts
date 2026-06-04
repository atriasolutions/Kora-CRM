import { emailButton, emailLayout } from './layout.js'

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
    preheader: 'Activa tu cuenta y configura tu acceso seguro.',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hola <strong>${params.userName}</strong>,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Tu cuenta en <strong>Kora CRM</strong> está lista. Solo falta un paso para empezar a trabajar con tu equipo.
      </p>
      <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#475569;">
        <li>Define tu contraseña personal</li>
        <li>Elige una pregunta de seguridad (recuperación de acceso)</li>
        <li>Activa tu perfil — estado <strong>Por verificar</strong> → <strong>Activo</strong></li>
      </ul>
      ${emailButton(params.activateUrl, 'Activar mi cuenta')}
      <p style="margin:0;font-size:13px;color:#64748b;">El enlace caduca en <strong>${params.expiresHours} horas</strong>.</p>
    `,
  })

  return { subject, text, html, category: 'Account Setup' }
}
