import { pool } from '../db/pool.js'
import { hashVerificationToken } from '../lib/verification-token.js'
import { badRequest, notFound } from '../middleware/errors.js'

export type VerificationPurpose = 'account_setup' | 'password_reset'

const ACCOUNT_SETUP_HOURS = 48
const PASSWORD_RESET_HOURS = 2

export type SecurityQuestionRow = {
  id: string
  prompt: string
}

export async function listSecurityQuestions(): Promise<SecurityQuestionRow[]> {
  const result = await pool.query<SecurityQuestionRow>(
    `SELECT id, prompt FROM crm_security_questions
     WHERE active = true
     ORDER BY sort_order ASC, prompt ASC`,
  )
  return result.rows
}

export async function invalidateUserTokens(
  userId: string,
  purpose: VerificationPurpose,
): Promise<void> {
  await pool.query(
    `UPDATE crm_user_verification_tokens
     SET used_at = now()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose],
  )
}

export async function insertVerificationToken(params: {
  userId: string
  tokenHash: string
  purpose: VerificationPurpose
  expiresAt: Date
}): Promise<void> {
  await invalidateUserTokens(params.userId, params.purpose)
  await pool.query(
    `INSERT INTO crm_user_verification_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [params.userId, params.tokenHash, params.purpose, params.expiresAt],
  )
}

export function expiresAtForPurpose(purpose: VerificationPurpose): Date {
  const hours =
    purpose === 'account_setup' ? ACCOUNT_SETUP_HOURS : PASSWORD_RESET_HOURS
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export function expiresHoursForPurpose(purpose: VerificationPurpose): number {
  return purpose === 'account_setup' ? ACCOUNT_SETUP_HOURS : PASSWORD_RESET_HOURS
}

export type TokenUserRow = {
  user_id: string
  email: string
  name: string
  status: string
  purpose: VerificationPurpose
}

export async function findValidTokenUser(
  token: string,
  purpose: VerificationPurpose,
): Promise<TokenUserRow | null> {
  const tokenHash = hashVerificationToken(token)
  const result = await pool.query<TokenUserRow>(
    `SELECT t.user_id, u.email, u.name, u.status::text AS status, t.purpose::text AS purpose
     FROM crm_user_verification_tokens t
     JOIN crm_users u ON u.id = t.user_id
     WHERE t.token_hash = $1
       AND t.purpose = $2
       AND t.used_at IS NULL
       AND t.expires_at > now()
       AND u.deleted_at IS NULL`,
    [tokenHash, purpose],
  )
  return result.rows[0] ?? null
}

export async function markTokenUsed(token: string): Promise<void> {
  const tokenHash = hashVerificationToken(token)
  await pool.query(
    `UPDATE crm_user_verification_tokens
     SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash],
  )
}

export async function activateUserAccount(params: {
  userId: string
  password: string
  questionId: string
  answerNormalized: string
}): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const q = await client.query<{ id: string }>(
      `SELECT id FROM crm_security_questions WHERE id = $1 AND active = true`,
      [params.questionId],
    )
    if (!q.rows[0]) throw badRequest('Pregunta de seguridad no válida')

    await client.query(
      `UPDATE crm_users SET
        password_hash = crypt($2, gen_salt('bf')),
        status = 'Activo',
        updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [params.userId, params.password],
    )

    await client.query(
      `INSERT INTO crm_user_security_answers (user_id, question_id, answer_hash, updated_at)
       VALUES ($1, $2, crypt($3, gen_salt('bf')), now())
       ON CONFLICT (user_id) DO UPDATE SET
         question_id = EXCLUDED.question_id,
         answer_hash = EXCLUDED.answer_hash,
         updated_at = now()`,
      [params.userId, params.questionId, params.answerNormalized],
    )

    await client.query(
      `UPDATE crm_tenant_memberships
       SET status = 'active'::crm_membership_status
       WHERE user_id = $1
         AND status = 'invited'::crm_membership_status`,
      [params.userId],
    )

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function resetUserPassword(params: {
  userId: string
  password: string
}): Promise<void> {
  const result = await pool.query(
    `UPDATE crm_users SET
      password_hash = crypt($2, gen_salt('bf')),
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND status = 'Activo'`,
    [params.userId, params.password],
  )
  if (result.rowCount === 0) throw notFound('Usuario no encontrado')
}

export async function getUserEmailStatus(
  userId: string,
): Promise<{ email: string; name: string; status: string } | null> {
  const result = await pool.query<{ email: string; name: string; status: string }>(
    `SELECT email, name, status::text AS status
     FROM crm_users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  )
  return result.rows[0] ?? null
}

export async function findActiveUserByEmail(
  email: string,
): Promise<{ id: string; email: string; name: string } | null> {
  const result = await pool.query<{ id: string; email: string; name: string }>(
    `SELECT id, email, name FROM crm_users
     WHERE lower(email) = lower($1)
       AND deleted_at IS NULL
       AND status = 'Activo'`,
    [email.trim()],
  )
  return result.rows[0] ?? null
}
