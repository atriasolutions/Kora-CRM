import type {
  CreatePayrollInput,
  WorkerListItem,
  WorkerPayrollDeduction,
  WorkerPayrollEarning,
} from '../types/worker.js'

/** Descuento legal de salud por defecto (7% en Chile). */
const DEFAULT_HEALTH_RATE = 7
/** Tope simple de gratificación mensual editable (25% del sueldo base proporcional). */
const GRATIFICATION_RATE = 0.25

export type PayrollComputation = {
  daysWorked: number
  daysLicense: number
  daysAbsence: number
  daysVacation: number
  earnings: WorkerPayrollEarning[]
  deductions: WorkerPayrollDeduction[]
  taxableBaseCents: number
  taxBaseCents: number
  grossCents: number
  netCents: number
  overdraftCents: number
}

/**
 * Cálculo simplificado de liquidación de sueldo (editable).
 * - Sueldo base proporcional a los días trabajados (base 30).
 * - Gratificación: usa `gratification_cents` o 25% del base proporcional.
 * - Descuentos: AFP y AFC según tasas de la ficha, salud 7% por defecto.
 * - Impuesto único de segunda categoría como campo editable.
 */
export function computePayroll(
  worker: WorkerListItem,
  input: CreatePayrollInput,
): PayrollComputation {
  const daysWorked = clampDays(input.daysWorked ?? 30)
  const daysLicense = clampDays(input.daysLicense ?? 0)
  const daysAbsence = clampDays(input.daysAbsence ?? 0)
  const daysVacation = clampDays(input.daysVacation ?? 0)

  const baseSalaryCents = Math.round(worker.baseSalaryNum * 100)
  const proportionalBase = Math.round((baseSalaryCents * daysWorked) / 30)

  const configuredGratification = Math.round(worker.gratificationNum * 100)
  const gratificationCents =
    configuredGratification > 0
      ? Math.round((configuredGratification * daysWorked) / 30)
      : Math.round(proportionalBase * GRATIFICATION_RATE)

  const extraTaxableCents = Math.max(0, Math.round(input.extraTaxableCents ?? 0))
  const nonTaxableCents = Math.max(0, Math.round(input.nonTaxableCents ?? 0))

  const earnings: WorkerPayrollEarning[] = [
    { label: 'Sueldo base', amountCents: proportionalBase, taxable: true },
    { label: 'Gratificación', amountCents: gratificationCents, taxable: true },
  ]
  if (extraTaxableCents > 0) {
    earnings.push({ label: 'Otros haberes imponibles', amountCents: extraTaxableCents, taxable: true })
  }
  if (nonTaxableCents > 0) {
    earnings.push({ label: 'Haberes no imponibles', amountCents: nonTaxableCents, taxable: false })
  }

  const taxableBaseCents = proportionalBase + gratificationCents + extraTaxableCents
  const grossCents = taxableBaseCents + nonTaxableCents

  const afpRate = worker.afpRate || 0
  const afcRate = worker.afcRate || 0
  const afpCents = Math.round((taxableBaseCents * afpRate) / 100)
  const healthCents = Math.round((taxableBaseCents * DEFAULT_HEALTH_RATE) / 100)
  const afcCents = Math.round((taxableBaseCents * afcRate) / 100)
  const incomeTaxCents = Math.max(0, Math.round(input.incomeTaxCents ?? 0))

  const deductions: WorkerPayrollDeduction[] = [
    { label: `AFP${worker.afpName ? ` ${worker.afpName}` : ''}`, amountCents: afpCents },
    { label: `Salud${worker.healthInstitution ? ` ${worker.healthInstitution}` : ''}`, amountCents: healthCents },
  ]
  if (afcCents > 0) {
    deductions.push({ label: 'Seguro cesantía (AFC)', amountCents: afcCents })
  }
  if (incomeTaxCents > 0) {
    deductions.push({ label: 'Impuesto único', amountCents: incomeTaxCents })
  }

  // Base tributable = imponible − descuentos previsionales.
  const taxBaseCents = Math.max(0, taxableBaseCents - afpCents - healthCents - afcCents)
  const totalDeductions = afpCents + healthCents + afcCents + incomeTaxCents
  const rawNet = grossCents - totalDeductions
  const netCents = Math.max(0, rawNet)
  const overdraftCents = rawNet < 0 ? -rawNet : 0

  return {
    daysWorked,
    daysLicense,
    daysAbsence,
    daysVacation,
    earnings,
    deductions,
    taxableBaseCents,
    taxBaseCents,
    grossCents,
    netCents,
    overdraftCents,
  }
}

function clampDays(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(31, Math.max(0, Math.round(value * 100) / 100))
}
