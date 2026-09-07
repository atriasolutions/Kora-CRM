export const WORKER_STATUSES = ['Activo', 'Licencia', 'Finiquitado'] as const
export type WorkerStatus = (typeof WORKER_STATUSES)[number]

export const WORKER_CONTRACT_TYPES = [
  'Indefinido',
  'Plazo fijo',
  'Honorarios',
  'Part-time',
] as const
export type WorkerContractType = (typeof WORKER_CONTRACT_TYPES)[number]

export const WORKER_VACATION_STATUSES = [
  'Pendiente',
  'Aprobada',
  'Rechazada',
] as const
export type WorkerVacationStatus = (typeof WORKER_VACATION_STATUSES)[number]

/** Días de vacaciones legales que se acumulan por mes trabajado (15 hábiles / 12). */
export const VACATION_DAYS_PER_MONTH = 1.25

export type WorkerListItem = {
  id: string
  number: string
  fullName: string
  taxId: string
  email: string
  phone: string
  address: string
  avatarUrl: string
  jobTitle: string
  businessUnit: string
  jobFunctions: string
  status: WorkerStatus | string
  contractType: WorkerContractType | string
  workHours: number
  startDate: string
  startDateIso: string
  endDate: string
  endDateIso: string
  baseSalary: string
  baseSalaryNum: number
  gratification: string
  gratificationNum: number
  afpName: string
  afpRate: number
  healthInstitution: string
  healthPlan: string
  afcRate: number
  vacationAdjustmentDays: number
  paydayDay: number
  owner: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type WorkerVacationRequest = {
  id: string
  workerId: string
  startDate: string
  startDateIso: string
  endDate: string
  endDateIso: string
  days: number
  status: WorkerVacationStatus | string
  notes: string
  createdAt: string
  createdByName: string
}

export type WorkerVacationSummary = {
  accruedDays: number
  usedDays: number
  adjustmentDays: number
  balanceDays: number
}

export type WorkerPayrollEarning = {
  label: string
  amountCents: number
  taxable?: boolean
}

export type WorkerPayrollDeduction = {
  label: string
  amountCents: number
}

export type WorkerPayrollListItem = {
  id: string
  workerId: string
  periodYear: number
  periodMonth: number
  periodLabel: string
  daysWorked: number
  daysLicense: number
  daysAbsence: number
  daysVacation: number
  ufValueCents: number
  earnings: WorkerPayrollEarning[]
  deductions: WorkerPayrollDeduction[]
  taxableBaseCents: number
  taxBaseCents: number
  grossCents: number
  netCents: number
  overdraftCents: number
  gross: string
  net: string
  paidAt: string | null
  pdfPath: string | null
  createdAt: string
  createdByName: string
}

export type WorkerDetail = WorkerListItem & {
  vacationSummary: WorkerVacationSummary
  vacations: WorkerVacationRequest[]
  payrolls: WorkerPayrollListItem[]
}

export type CreateWorkerInput = {
  number?: string
  fullName?: string
  taxId?: string
  email?: string
  phone?: string
  address?: string
  avatarUrl?: string
  jobTitle?: string
  businessUnit?: string
  jobFunctions?: string
  status?: string
  contractType?: string
  workHours?: number
  startDate?: string
  endDate?: string | null
  baseSalary?: string
  baseSalaryCents?: number
  baseSalaryNum?: number
  gratification?: string
  gratificationCents?: number
  gratificationNum?: number
  afpName?: string
  afpRate?: number
  healthInstitution?: string
  healthPlan?: string
  afcRate?: number
  vacationAdjustmentDays?: number
  paydayDay?: number
  ownerName?: string
}

export type UpdateWorkerInput = Partial<CreateWorkerInput>

export type ListWorkersParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  contractType?: string
  businessUnit?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  ownerName?: string
}

export type CreateVacationInput = {
  startDate: string
  endDate: string
  days?: number
  status?: string
  notes?: string
}

export type UpdateVacationInput = {
  status?: string
  notes?: string
}

export type CreatePayrollInput = {
  periodYear?: number
  periodMonth?: number
  daysWorked?: number
  daysLicense?: number
  daysAbsence?: number
  daysVacation?: number
  ufValueCents?: number
  /** Impuesto único de segunda categoría (editable). */
  incomeTaxCents?: number
  /** Otros haberes imponibles adicionales (bonos, etc.). */
  extraTaxableCents?: number
  /** Otros haberes no imponibles (colación, movilización). */
  nonTaxableCents?: number
  paid?: boolean
}
