import { env } from '../config/env.js'
import { accountSetupEmail } from '../emails/account-setup.js'
import { passwordResetEmail } from '../emails/password-reset.js'
import { tenantAccessGrantedEmail } from '../emails/tenant-access-granted.js'
import { createVerificationToken } from '../lib/verification-token.js'
import { statusCountsTowardSeat } from '../lib/tenant-quota-modules.js'
import { badRequest } from '../middleware/errors.js'
import { platformQuery } from '../db/tenant-query.js'
import {
  activateUserAccount,
  expiresAtForPurpose,
  expiresHoursForPurpose,
  findActiveUserByEmail,
  findValidTokenUser,
  getUserEmailStatus,
  insertVerificationToken,
  listSecurityQuestions,
  markTokenUsed,
  resetUserPassword,
  type VerificationPurpose,
} from '../repositories/user-onboarding.repository.js'
import { getTenantById } from '../repositories/tenants.repository.js'
import { getAccessProfileById } from '../repositories/access-profiles.repository.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { sendMail } from './mail.service.js'
import { assertCanConsumeSeat } from './tenant-quota.service.js'
import { normalizeSecurityAnswer } from '../lib/verification-token.js'

function buildUrl(path: string, token: string): string {
  const base = env.appPublicUrl
  const sep = path.includes('?') ? '&' : '?'
  return `${base}${path}${sep}token=${encodeURIComponent(token)}`
}

function buildTenantLoginUrl(slug: string): string {
  return `https://${slug}.${env.platformDomain}/login`
}

function buildCentralLoginUrl(): string {
  return `https://${env.platformDomain}/login`
}

export async function sendTenantAccessGranted(input: {
  userId: string
  tenantId: string
  profileId: string
  displayName?: string
}): Promise<{ emailed: boolean }> {
  const user = await getUserEmailStatus(input.userId)
  if (!user) throw badRequest('Usuario no encontrado')

  const tenant = await getTenantById(input.tenantId)
  if (!tenant) throw badRequest('Empresa no encontrada')

  return runWithTenantAsync({ tenantId: input.tenantId }, async () => {
    const profile = await getAccessProfileById(input.profileId)
    const profileName = profile?.name?.trim() || 'Usuario'
    const accountInactive = user.status !== 'Activo'

    const mail = tenantAccessGrantedEmail({
      userName: input.displayName?.trim() || user.name,
      tenantName: tenant.displayName,
      profileName,
      loginUrl: buildTenantLoginUrl(tenant.slug),
      centralLoginUrl: buildCentralLoginUrl(),
      accountInactive,
    })

    const emailed = await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      category: mail.category,
    })

    return { emailed }
  })
}

export async function sendAccountSetupInvite(userId: string): Promise<{
  emailed: boolean
  expiresHours: number
}> {
  const user = await getUserEmailStatus(userId)
  if (!user) throw badRequest('Usuario no encontrado')
  if (user.status !== 'Por verificar' && user.status !== 'Invitado') {
    throw badRequest(
      'Solo se puede invitar a usuarios en estado Por verificar o Invitado.',
    )
  }

  const { token, tokenHash } = createVerificationToken()
  const purpose: VerificationPurpose = 'account_setup'
  await insertVerificationToken({
    userId,
    tokenHash,
    purpose,
    expiresAt: expiresAtForPurpose(purpose),
  })

  const expiresHours = expiresHoursForPurpose(purpose)
  const activateUrl = buildUrl('/activar-cuenta', token)
  const mail = accountSetupEmail({
    userName: user.name,
    activateUrl,
    expiresHours,
  })

  const emailed = await sendMail({
    to: user.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    category: mail.category,
  })

  return { emailed, expiresHours }
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const user = await findActiveUserByEmail(email)
  if (!user) return

  const { token, tokenHash } = createVerificationToken()
  const purpose: VerificationPurpose = 'password_reset'
  await insertVerificationToken({
    userId: user.id,
    tokenHash,
    purpose,
    expiresAt: expiresAtForPurpose(purpose),
  })

  const resetUrl = buildUrl('/restablecer-contraseña', token)
  const mail = passwordResetEmail({
    userName: user.name,
    resetUrl,
    expiresHours: expiresHoursForPurpose(purpose),
  })

  await sendMail({
    to: user.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    category: mail.category,
  })
}

export async function validateVerificationToken(
  token: string,
  purpose: VerificationPurpose,
) {
  const row = await findValidTokenUser(token, purpose)
  if (!row) return { valid: false as const }

  if (purpose === 'account_setup') {
    if (row.status !== 'Por verificar' && row.status !== 'Invitado') {
      return { valid: false as const }
    }
  }

  return {
    valid: true as const,
    email: row.email,
    name: row.name,
    purpose: row.purpose,
    expiresHours: expiresHoursForPurpose(purpose),
  }
}

export async function completeAccountSetup(input: {
  token: string
  password: string
  questionId: string
  securityAnswer: string
}) {
  const row = await findValidTokenUser(input.token, 'account_setup')
  if (!row) throw badRequest('El enlace no es válido o ya expiró.')

  if (input.password.length < 8) {
    throw badRequest('La contraseña debe tener al menos 8 caracteres.')
  }
  if (!input.securityAnswer.trim()) {
    throw badRequest('Indica la respuesta a tu pregunta de seguridad.')
  }

  if (!statusCountsTowardSeat(row.status)) {
    const memberships = await platformQuery<{ tenant_id: string }>(
      `SELECT tenant_id FROM crm_tenant_memberships WHERE user_id = $1`,
      [row.user_id],
    )
    for (const membership of memberships.rows) {
      await assertCanConsumeSeat(membership.tenant_id, {
        userId: row.user_id,
        userName: row.name,
        tenantId: membership.tenant_id,
        isPlatformOperator: false,
      })
    }
  }

  await activateUserAccount({
    userId: row.user_id,
    password: input.password,
    questionId: input.questionId,
    answerNormalized: normalizeSecurityAnswer(input.securityAnswer),
  })
  await markTokenUsed(input.token)

  return { ok: true, email: row.email }
}

export async function completePasswordReset(input: {
  token: string
  password: string
}) {
  const row = await findValidTokenUser(input.token, 'password_reset')
  if (!row) throw badRequest('El enlace no es válido o ya expiró.')
  if (input.password.length < 8) {
    throw badRequest('La contraseña debe tener al menos 8 caracteres.')
  }

  await resetUserPassword({ userId: row.user_id, password: input.password })
  await markTokenUsed(input.token)
  return { ok: true }
}

export async function getSecurityQuestionsForPublic() {
  return listSecurityQuestions()
}

/** Evita enumeración de correos en olvidé contraseña. */
export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(email)
  return {
    message:
      'Si el correo está registrado y activo, recibirás instrucciones en breve.',
  }
}
