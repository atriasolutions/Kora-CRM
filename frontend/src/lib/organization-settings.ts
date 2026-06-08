import { isApiEnabled } from '@/api/config'
import { DEMO_ORG_NAME, STORAGE_PREFIX } from '@/config/brand'
import { getOrganizationSettingsSnapshot } from '@/data/organization-settings-store'
import type { OrganizationSettings } from '@/types/organization-settings'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-organization-settings`

export function defaultOrganizationSettings(): OrganizationSettings {
  return {
    legalName: DEMO_ORG_NAME.toUpperCase(),
    tradeName: 'Kora',
    tagline: 'Gestión comercial integrada',
    rut: '76.000.000-0',
    giro: 'SERVICIOS DE SOFTWARE Y CONSULTORÍA',
    address: 'Av. Providencia 1200, Of. 402',
    city: 'Santiago',
    region: 'Metropolitana de Santiago',
    commune: 'Providencia',
    phone: '+56 2 2000 0000',
    email: 'compras@kora.cl',
    logoUrl: '',
    defaultVatPercent: 19,
    invoicingMode: 'manual',
    economicActivityCode: null,
    defaultSolicitudAssigneeUserId: null,
    defaultSolicitudAssigneeName: '',
  }
}

export function loadOrganizationSettings(): OrganizationSettings {
  if (isApiEnabled()) {
    const snapshot = getOrganizationSettingsSnapshot()
    if (snapshot) return snapshot
    return defaultOrganizationSettings()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultOrganizationSettings()
    const parsed = JSON.parse(raw) as Partial<OrganizationSettings>
    return { ...defaultOrganizationSettings(), ...parsed }
  } catch {
    return defaultOrganizationSettings()
  }
}

export function saveOrganizationSettings(settings: OrganizationSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* quota */
  }
}

export function organizationSettingsToFormValues(
  settings: OrganizationSettings,
): OrganizationSettings {
  return { ...settings }
}

export function validateOrganizationSettings(
  values: OrganizationSettings,
): string | null {
  if (!values.legalName.trim()) return 'El nombre legal de la empresa es obligatorio.'
  if (!values.rut.trim()) return 'El RUT de la empresa es obligatorio.'
  if (!values.email.trim()) return 'El email de contacto es obligatorio.'
  const region = values.region.trim()
  const commune = values.commune.trim()
  if (region && !commune) return 'Selecciona una comuna para la región indicada.'
  if (commune && !region) return 'Selecciona una región para la comuna indicada.'
  if (values.invoicingMode === 'sii') {
    if (!values.giro.trim()) return 'El giro es obligatorio para facturación SII.'
    if (!values.commune.trim()) return 'La comuna es obligatoria para facturación SII.'
    if (values.economicActivityCode == null || values.economicActivityCode <= 0) {
      return 'Indica el código de actividad económica SII.'
    }
  }
  return null
}
