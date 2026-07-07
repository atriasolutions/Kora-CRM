import {
  PLATFORM_PRIVACY_POLICY_URL,
  PLATFORM_LEGAL,
} from '../lib/platform-legal.js'
import { getOrganizationSettings } from '../repositories/organization-settings.repository.js'
import type { TenantPrivacyNotice } from '../types/privacy.js'

export async function getTenantPrivacyNotice(): Promise<TenantPrivacyNotice> {
  const settings = await getOrganizationSettings()
  const contactEmail =
    settings.privacyContactEmail?.trim() ||
    settings.email?.trim() ||
    PLATFORM_LEGAL.controllerEmail

  return {
    controllerLegalName: settings.legalName?.trim() || PLATFORM_LEGAL.controllerLegalName,
    controllerTradeName: settings.tradeName?.trim() || PLATFORM_LEGAL.controllerTradeName,
    privacyPolicyUrl:
      settings.privacyPolicyUrl?.trim() ||
      PLATFORM_PRIVACY_POLICY_URL,
    privacyContactEmail: contactEmail,
    dpoName: settings.dpoName?.trim() || undefined,
    privacyPolicyVersion:
      settings.privacyPolicyVersion?.trim() || PLATFORM_LEGAL.privacyVersion,
    dataRetentionDays: settings.dataRetentionDays ?? 2555,
    platformPrivacyUrl: PLATFORM_PRIVACY_POLICY_URL,
  }
}

export async function getPublicPrivacyMeta() {
  const notice = await getTenantPrivacyNotice()
  return {
    platform: PLATFORM_LEGAL,
    tenant: notice,
    rights: ['acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo'],
    responseDays: 30,
  }
}
