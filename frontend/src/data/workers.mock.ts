import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'
import type { ContactNote } from '@/data/contact-detail.mock'
import type { EntityFileRecord } from '@/lib/entity-files'

export const WORKER_STATUSES = ['Activo', 'Licencia', 'Finiquitado'] as const
export type WorkerStatus = (typeof WORKER_STATUSES)[number]

export const WORKER_CONTRACT_TYPES = [
  'Indefinido',
  'Plazo fijo',
  'Honorarios',
  'Part-time',
] as const
export type WorkerContractType = (typeof WORKER_CONTRACT_TYPES)[number]

export const WORKER_VACATION_STATUSES = ['Pendiente', 'Aprobada', 'Rechazada'] as const
export type WorkerVacationStatus = (typeof WORKER_VACATION_STATUSES)[number]

export const WORKER_STATUS_OPTIONS: WorkerStatus[] = [...WORKER_STATUSES]
export const WORKER_CONTRACT_TYPE_OPTIONS: WorkerContractType[] = [...WORKER_CONTRACT_TYPES]

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
  startDateIso?: string
  endDate: string
  endDateIso?: string
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
} & RecordAuditFields

export type WorkerVacationRequest = {
  id: string
  workerId: string
  startDate: string
  startDateIso?: string
  endDate: string
  endDateIso?: string
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
  notes: ContactNote[]
  files: EntityFileRecord[]
}

const workerSeedRaw: Omit<WorkerListItem, keyof RecordAuditFields>[] = [
  {
    id: 'trb1',
    number: 'TRB-2024-0001',
    fullName: 'Camila Fuentes',
    taxId: '18.456.789-0',
    email: 'camila.fuentes@empresa.cl',
    phone: '+56 9 8765 4321',
    address: 'Av. Providencia 1234, Santiago',
    avatarUrl: '',
    jobTitle: 'Analista de operaciones',
    businessUnit: 'Operaciones',
    jobFunctions: 'Coordinación logística y control de inventario.',
    status: 'Activo',
    contractType: 'Indefinido',
    workHours: 45,
    startDate: '1 mar 2023',
    endDate: '',
    baseSalary: '$1.200.000',
    baseSalaryNum: 1200000,
    gratification: '$0',
    gratificationNum: 0,
    afpName: 'Modelo',
    afpRate: 11.44,
    healthInstitution: 'Fonasa',
    healthPlan: '',
    afcRate: 0.6,
    vacationAdjustmentDays: 0,
    paydayDay: 5,
    owner: 'Ana Ruiz',
  },
]

export const workerListSeed: WorkerListItem[] = ensureRecordAuditList(
  workerSeedRaw,
  (x) => x.owner,
)

export function resolveWorkerListItem(id: string): WorkerListItem {
  const seed = workerListSeed.find((row) => row.id === id)
  if (seed) return { ...seed }
  return {
    id,
    number: '—',
    fullName: 'Trabajador',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: '',
    jobTitle: '',
    businessUnit: '',
    jobFunctions: '',
    status: 'Activo',
    contractType: 'Indefinido',
    workHours: 45,
    startDate: '—',
    endDate: '',
    baseSalary: '$0',
    baseSalaryNum: 0,
    gratification: '$0',
    gratificationNum: 0,
    afpName: '',
    afpRate: 0,
    healthInstitution: '',
    healthPlan: '',
    afcRate: 0,
    vacationAdjustmentDays: 0,
    paydayDay: 5,
    owner: '—',
    createdAt: '',
    createdById: '',
    createdByName: '—',
    updatedAt: '',
    updatedById: '',
    updatedByName: '—',
  }
}

export function getWorkerDetail(id: string): WorkerDetail {
  const list = resolveWorkerListItem(id)
  return {
    ...list,
    vacationSummary: { accruedDays: 0, usedDays: 0, adjustmentDays: 0, balanceDays: 0 },
    vacations: [],
    payrolls: [],
    notes: [],
    files: [],
  }
}
