import type { WorkerStatus } from '@/data/workers.mock'
import type { BadgeVariant } from '@/types/list-module'

export function workerStatusVariant(status: WorkerStatus | string): BadgeVariant {
  switch (status) {
    case 'Activo':
      return 'customer'
    case 'Licencia':
      return 'negotiation'
    case 'Finiquitado':
      return 'destructive'
    default:
      return 'muted'
  }
}

export function parseWorkerAmountNum(amount: string): number {
  return Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
}

export function formatWorkerAmount(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

export function formatCentsToMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('es-CL')}`
}

export function formatVacationDays(days: number): string {
  const rounded = Math.round(days * 100) / 100
  return `${rounded} día${rounded === 1 ? '' : 's'}`
}
