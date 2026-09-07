import { VACATION_DAYS_PER_MONTH, type WorkerVacationSummary } from '../types/worker.js'

/** Meses completos transcurridos entre dos fechas (yyyy-mm-dd). */
function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  if (end <= start) return 0
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  if (end.getUTCDate() < start.getUTCDate()) months -= 1
  return Math.max(0, months)
}

/**
 * Saldo de vacaciones legales.
 * - Acumula {@link VACATION_DAYS_PER_MONTH} (1.25) días por mes desde `startDate`.
 * - Usados = solicitudes aprobadas + días de vacaciones incluidos en liquidaciones.
 * - Saldo = acumulado − usados + ajuste manual.
 */
export function computeVacationSummary(input: {
  startDateIso?: string | null
  adjustmentDays?: number
  approvedVacationDays?: number
  payrollVacationDays?: number
  asOfIso?: string
}): WorkerVacationSummary {
  const asOf = input.asOfIso ?? new Date().toISOString().slice(0, 10)
  const months = input.startDateIso ? monthsBetween(input.startDateIso, asOf) : 0
  const accruedDays = round2(months * VACATION_DAYS_PER_MONTH)
  const usedDays = round2((input.approvedVacationDays ?? 0) + (input.payrollVacationDays ?? 0))
  const adjustmentDays = round2(input.adjustmentDays ?? 0)
  const balanceDays = round2(accruedDays - usedDays + adjustmentDays)
  return { accruedDays, usedDays, adjustmentDays, balanceDays }
}

/** Días corridos entre dos fechas inclusive (yyyy-mm-dd). */
export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return diff >= 0 ? diff + 1 : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
