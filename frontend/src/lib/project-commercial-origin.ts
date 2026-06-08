import type { ProjectFormValues } from '@/lib/project-form'

export type ProjectCommercialOrigin = 'none' | 'oportunidad' | 'solicitud'

export function inferCommercialOrigin(
  values: Pick<ProjectFormValues, 'commercialOrigin' | 'solicitudId' | 'opportunityId'>,
): ProjectCommercialOrigin {
  if (values.commercialOrigin && values.commercialOrigin !== 'none') {
    return values.commercialOrigin
  }
  if (values.solicitudId?.trim()) return 'solicitud'
  if (values.opportunityId?.trim()) return 'oportunidad'
  return 'none'
}

export function applyCommercialOriginChange(
  origin: ProjectCommercialOrigin,
): Partial<ProjectFormValues> {
  if (origin === 'oportunidad') {
    return {
      commercialOrigin: 'oportunidad',
      solicitudId: '',
      solicitudTitle: '',
      solicitudCode: '',
    }
  }
  if (origin === 'solicitud') {
    return {
      commercialOrigin: 'solicitud',
      opportunityId: '',
      opportunityName: '',
      acceptedQuoteId: '',
      acceptedQuoteCode: '',
    }
  }
  return {
    commercialOrigin: 'none',
    opportunityId: '',
    opportunityName: '',
    acceptedQuoteId: '',
    acceptedQuoteCode: '',
    solicitudId: '',
    solicitudTitle: '',
    solicitudCode: '',
  }
}

export function applySolicitudChange(
  solicitudId: string,
  solicitud?: { id: string; title: string; code: string },
): Partial<ProjectFormValues> {
  return {
    commercialOrigin: solicitudId.trim() ? 'solicitud' : 'none',
    solicitudId,
    solicitudTitle: solicitud?.title ?? '',
    solicitudCode: solicitud?.code ?? '',
    opportunityId: '',
    opportunityName: '',
    acceptedQuoteId: '',
    acceptedQuoteCode: '',
  }
}

export function validateCommercialOrigin(
  values: Pick<
    ProjectFormValues,
    'commercialOrigin' | 'opportunityId' | 'acceptedQuoteId' | 'solicitudId'
  >,
): string | null {
  const origin = inferCommercialOrigin(values)
  if (origin === 'solicitud' && !values.solicitudId?.trim()) {
    return 'Selecciona la solicitud de origen del proyecto.'
  }
  if (origin === 'oportunidad' && values.acceptedQuoteId?.trim() && !values.opportunityId?.trim()) {
    return 'Selecciona una oportunidad antes de vincular una cotización.'
  }
  if (
    origin === 'solicitud' &&
    (values.opportunityId?.trim() || values.acceptedQuoteId?.trim())
  ) {
    return 'Un proyecto no puede vincular solicitud y oportunidad/cotización a la vez.'
  }
  return null
}
