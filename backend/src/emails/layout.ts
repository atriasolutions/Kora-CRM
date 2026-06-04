import { env } from '../config/env.js'

export function emailLayout(params: {
  title: string
  preheader: string
  bodyHtml: string
}): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a1d21;">
  <span style="display:none;max-height:0;overflow:hidden;">${params.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${env.mailFromName}</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3;">${params.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e8ecf0;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                Este mensaje fue enviado por ${env.mailFromName}. Si no esperabas este correo, puedes ignorarlo.
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">© ${year} ${env.mailFromName}</p>
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
  <tr>
    <td style="border-radius:8px;background:#0f766e;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">Si el botón no funciona, copia este enlace:<br /><a href="${href}" style="color:#0f766e;">${href}</a></p>`
}
