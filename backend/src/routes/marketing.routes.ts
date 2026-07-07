import { Router } from 'express'

import {
  PLATFORM_LEGAL,
  PLATFORM_PRIVACY_POLICY_URL,
} from '../lib/platform-legal.js'
import * as marketingLead from '../services/marketing-lead.service.js'
import * as privacyConsentRepo from '../repositories/privacy-consent.repository.js'
import { supportRequestSchema, trialLeadSchema } from '../validators/marketing.validator.js'

export const marketingRouter = Router()

function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  return req.ip ?? null
}

marketingRouter.post('/trial-lead', async (req, res, next) => {
  try {
    const body = trialLeadSchema.parse(req.body)
    await privacyConsentRepo.recordPrivacyConsent({
      subjectType: 'trial_lead',
      subjectEmail: body.email,
      subjectName: body.name,
      consentGiven: true,
      policyVersion: body.privacyPolicyVersion ?? PLATFORM_LEGAL.privacyVersion,
      policyUrl: PLATFORM_PRIVACY_POLICY_URL,
      ipAddress: clientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
      tenantId: null,
      metadata: { source: 'marketing_trial_form', company: body.company.trim() },
    })
    const result = await marketingLead.submitTrialLead(body)
    res.status(201).json({ data: result })
  } catch (e) {
    next(e)
  }
})

marketingRouter.post('/support-request', async (req, res, next) => {
  try {
    const body = supportRequestSchema.parse(req.body)
    await privacyConsentRepo.recordPrivacyConsent({
      subjectType: 'support_request',
      subjectEmail: body.email,
      subjectName: body.name,
      consentGiven: true,
      policyVersion: body.privacyPolicyVersion ?? PLATFORM_LEGAL.privacyVersion,
      policyUrl: PLATFORM_PRIVACY_POLICY_URL,
      ipAddress: clientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
      tenantId: null,
      metadata: { source: 'marketing_support_form', topic: body.topic },
    })
    const result = await marketingLead.submitSupportRequest(body)
    res.status(201).json({ data: result })
  } catch (e) {
    next(e)
  }
})
