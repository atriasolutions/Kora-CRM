import 'dotenv/config'

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Variable de entorno requerida: ${name}`)
  }
  return value
}

export const env = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL', 'postgresql://localhost:5432/zenter_crm'),
  demoUserId: required(
    'DEMO_USER_ID',
    'b1000001-0001-4001-8001-000000000001',
  ),
  demoUserName: process.env.DEMO_USER_NAME ?? 'María López',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  appPublicUrl: (process.env.APP_PUBLIC_URL ?? 'http://localhost:5173').replace(
    /\/$/,
    '',
  ),
  /** Mailtrap Sandbox SMTP (preferido en desarrollo). */
  mailSmtpHost: process.env.MAIL_SMTP_HOST ?? 'sandbox.smtp.mailtrap.io',
  mailSmtpPort: Number.parseInt(process.env.MAIL_SMTP_PORT ?? '2525', 10),
  mailSmtpUser: (process.env.MAIL_SMTP_USER ?? '').trim(),
  mailSmtpPass: (process.env.MAIL_SMTP_PASS ?? '').trim(),
  /** Alternativa: API con token (Sending). */
  mailtrapToken: process.env.MAILTRAP_TOKEN ?? '',
  mailFromAddress: process.env.MAIL_FROM_ADDRESS ?? 'noreply@atriasolutions.cl',
  mailFromName: process.env.MAIL_FROM_NAME ?? 'Kora CRM',
  mailEnabled: process.env.MAIL_ENABLED !== 'false',
  /** Opcional: fuerza destinatario (solo si usas API con dominio demo). */
  mailOverrideTo: (process.env.MAIL_OVERRIDE_TO ?? '').trim(),
  /** Destino de solicitudes «Prueba gratis» desde la landing pública. */
  marketingLeadTo: (
    process.env.MARKETING_LEAD_TO ??
    process.env.MAIL_OVERRIDE_TO ??
    'contacto@atriasolutions.cl'
  ).trim(),
  /** Clave para cifrar secretos TOTP (mín. 16 caracteres; en producción usar valor fuerte). */
  totpEncryptionKey:
    process.env.TOTP_ENCRYPTION_KEY ??
    'kora-dev-totp-key-change-in-production',
  totpIssuer: process.env.TOTP_ISSUER ?? 'Kora CRM',
  platformDomain: (process.env.PLATFORM_DOMAIN ?? 'koracrm.cl').trim().toLowerCase(),
  /** Tenant por defecto en desarrollo sin subdominio. */
  defaultTenantSlug: (process.env.DEFAULT_TENANT_SLUG ?? 'atriasolutions').trim().toLowerCase(),
  /** Responsable comercial de leads «Prueba gratis» (tenant Atria). */
  marketingLeadOwnerName: (
    process.env.MARKETING_LEAD_OWNER_NAME ?? 'Nicolas Gutierrez'
  ).trim(),
  /** Email del responsable comercial (prioritario sobre nombre). */
  marketingLeadOwnerEmail: (
    process.env.MARKETING_LEAD_OWNER_EMAIL ?? 'ngutierrez@atriasolutions.cl'
  ).trim(),
  /** UUID opcional del responsable comercial (prioritario sobre email). */
  marketingLeadOwnerUserId: (process.env.MARKETING_LEAD_OWNER_USER_ID ?? '').trim(),
  /** Origen en contactos creados desde la landing (valor de CONTACT_SOURCE_OPTIONS). */
  marketingLeadSource: (process.env.MARKETING_LEAD_SOURCE ?? 'Formulario web').trim(),
  /** Crea tenant trial + usuario admin + mail al solicitante del formulario demo. */
  marketingAutoProvisionTrial: process.env.MARKETING_AUTO_PROVISION_TRIAL !== 'false',
  /** Días de vigencia del tenant trial. */
  marketingTrialDays: Number.parseInt(process.env.MARKETING_TRIAL_DAYS ?? '14', 10),
  /** Cifrado AES de certificados SII (.p12) en reposo. */
  siiCredentialsEncryptionKey:
    process.env.SII_CREDENTIALS_ENCRYPTION_KEY ??
    process.env.TOTP_ENCRYPTION_KEY ??
    'kora-dev-sii-key-change-in-production',
  /** Ambiente SII por defecto: certification | production */
  siiDefaultEnv: (process.env.SII_ENV ?? 'certification') as 'certification' | 'production',
}
