import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** CID para incrustar el logo en clientes de correo vía nodemailer (respaldo local). */
export const KORA_EMAIL_LOGO_CID = 'kora-logo@kora'

const KORA_EMAIL_LOGO_FILENAME = 'logo_kora_limpio.png'

/** URL pública del logo (servida por el frontend en producción). */
export function koraEmailLogoUrl(appPublicUrl: string): string {
  return `${appPublicUrl.replace(/\/$/, '')}/${KORA_EMAIL_LOGO_FILENAME}`
}

/** Ruta al PNG en disco (dist/assets tras build, o src/assets en desarrollo). */
export function resolveKoraEmailLogoPath(): string | null {
  const candidates = [
    path.join(__dirname, '../assets', KORA_EMAIL_LOGO_FILENAME),
    path.join(process.cwd(), 'dist/assets', KORA_EMAIL_LOGO_FILENAME),
    path.join(process.cwd(), 'src/assets', KORA_EMAIL_LOGO_FILENAME),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

/** Paleta alineada al gradiente del logo Kora. */
export const koraBrand = {
  purple: '#9333ea',
  violet: '#7c3aed',
  cyan: '#06b6d4',
  sky: '#22d3ee',
  ink: '#0f172a',
  slate: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#ffffff',
  canvas: '#eef1f6',
  headerGradient: 'linear-gradient(135deg, #1e1033 0%, #0f2847 48%, #0c4a6e 100%)',
  buttonGradient: 'linear-gradient(135deg, #9333ea 0%, #2563eb 52%, #06b6d4 100%)',
  accentBar: 'linear-gradient(90deg, #9333ea 0%, #06b6d4 100%)',
} as const

export function koraEmailLogoBlock(size = 64, logoSrc?: string): string {
  const src = logoSrc ?? `cid:${KORA_EMAIL_LOGO_CID}`
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr>
    <td style="background:#ffffff;border-radius:16px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);">
      <img src="${src}" width="${size}" height="${size}" alt="Kora CRM" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;" />
    </td>
  </tr>
</table>`
}
