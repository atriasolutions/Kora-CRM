import { isApiEnabled } from '@/api/config'
import { getOrganizationSettingsSnapshot } from '@/data/organization-settings-store'
import {
  defaultOrganizationSettings,
  loadOrganizationSettings,
} from '@/lib/organization-settings'

export const FALLBACK_VAT_PERCENT = 19

export function getDefaultVatPercent(): number {
  const fromSnapshot = getOrganizationSettingsSnapshot()?.defaultVatPercent
  if (fromSnapshot != null && Number.isFinite(fromSnapshot)) {
    return fromSnapshot
  }
  if (!isApiEnabled()) {
    return loadOrganizationSettings().defaultVatPercent
  }
  return FALLBACK_VAT_PERCENT
}

export function getProductDefaultTaxRateString(): string {
  return String(getDefaultVatPercent())
}

export function formatVatPercentLabel(percent = getDefaultVatPercent()): string {
  return `${percent}% IVA`
}

export function validateDefaultVatPercent(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return 'El IVA debe ser un porcentaje entre 0 y 100.'
  }
  return null
}

/** @deprecated Usar getProductDefaultTaxRateString() */
export const PRODUCT_DEFAULT_TAX_RATE = String(FALLBACK_VAT_PERCENT)
