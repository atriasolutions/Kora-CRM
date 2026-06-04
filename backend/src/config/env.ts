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
  mailFromAddress: process.env.MAIL_FROM_ADDRESS ?? 'noreply@kora.io',
  mailFromName: process.env.MAIL_FROM_NAME ?? 'Kora CRM',
  mailEnabled: process.env.MAIL_ENABLED !== 'false',
  /** Opcional: fuerza destinatario (solo si usas API con dominio demo). */
  mailOverrideTo: (process.env.MAIL_OVERRIDE_TO ?? '').trim(),
  /** Clave para cifrar secretos TOTP (mín. 16 caracteres; en producción usar valor fuerte). */
  totpEncryptionKey:
    process.env.TOTP_ENCRYPTION_KEY ??
    'kora-dev-totp-key-change-in-production',
  totpIssuer: process.env.TOTP_ISSUER ?? 'Kora CRM',
}
