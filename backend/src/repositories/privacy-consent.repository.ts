import { pool } from '../db/pool.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'

export type RecordConsentParams = {
  subjectType: 'trial_lead' | 'support_request' | 'contact' | 'public_form'
  subjectEmail: string
  subjectName?: string
  consentGiven: boolean
  policyVersion: string
  policyUrl?: string
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
  tenantId?: string | null
}

export async function recordPrivacyConsent(
  params: RecordConsentParams,
): Promise<void> {
  const tenantId = params.tenantId ?? getTenantIdOrDefault()
  await pool.query(
    `INSERT INTO crm_privacy_consent_records (
      tenant_id, subject_type, subject_email, subject_name,
      consent_given, policy_version, policy_url, ip_address, user_agent, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      tenantId || null,
      params.subjectType,
      params.subjectEmail.trim().toLowerCase(),
      params.subjectName?.trim() || null,
      params.consentGiven,
      params.policyVersion,
      params.policyUrl?.trim() || null,
      params.ipAddress || null,
      params.userAgent?.slice(0, 2000) || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  )
}
