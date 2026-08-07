import { chileDateString } from '@/lib/currency'
import type { PruebaSolicitudDetail } from '@/data/pruebas-solicitud.mock'

export type PruebaSolicitudFormValues = {
  solicitudId: string
  solicitudCode: string
  solicitudTitle: string
  description: string
  executedAt: string
}

export function createDefaultPruebaFormValues(
  partial?: Partial<PruebaSolicitudFormValues>,
): PruebaSolicitudFormValues {
  return {
    solicitudId: partial?.solicitudId ?? '',
    solicitudCode: partial?.solicitudCode ?? '',
    solicitudTitle: partial?.solicitudTitle ?? '',
    description: partial?.description ?? '',
    executedAt: partial?.executedAt ?? chileDateString(),
  }
}

export function pruebaFormFromDetail(detail: PruebaSolicitudDetail): PruebaSolicitudFormValues {
  return {
    solicitudId: detail.solicitudId,
    solicitudCode: detail.solicitudCode,
    solicitudTitle: detail.solicitudTitle,
    description: detail.description,
    executedAt: detail.executedAt.includes('-') ? detail.executedAt : chileDateString(),
  }
}

export function formatPruebaClientProgress(count: number, total: number): string {
  if (total <= 0) return '—'
  return `${count}/${total} OK`
}
