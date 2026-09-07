import type {
  WorkerListItem,
  WorkerPayrollDeduction,
  WorkerPayrollEarning,
  WorkerPayrollListItem,
  WorkerVacationRequest,
} from '../types/worker.js'
import { formatCentsToMoney } from '../utils/money.js'
import { formatDateLabel, toDateOnlyIso, toIsoString } from '../utils/format.js'

export type WorkerRow = {
  id: string
  number: string
  full_name: string
  tax_id: string
  email: string
  phone: string
  address: string
  avatar_url: string | null
  job_title: string
  business_unit: string
  job_functions: string | null
  status: string
  contract_type: string
  work_hours: number | string
  start_date: Date | string | null
  end_date: Date | string | null
  base_salary_cents: string | number
  gratification_cents: string | number
  afp_name: string
  afp_rate: string | number
  health_institution: string
  health_plan: string
  afc_rate: string | number
  vacation_adjustment_days: string | number
  payday_day: number | string
  owner_name: string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function mapWorkerRow(row: WorkerRow): WorkerListItem {
  const baseSalaryCents = Number(row.base_salary_cents)
  const gratificationCents = Number(row.gratification_cents)
  return {
    id: row.id,
    number: row.number,
    fullName: row.full_name?.trim() || 'Sin nombre',
    taxId: row.tax_id?.trim() || '',
    email: row.email?.trim() || '',
    phone: row.phone?.trim() || '',
    address: row.address?.trim() || '',
    avatarUrl: row.avatar_url?.trim() || '',
    jobTitle: row.job_title?.trim() || '',
    businessUnit: row.business_unit?.trim() || '',
    jobFunctions: row.job_functions?.trim() || '',
    status: row.status,
    contractType: row.contract_type,
    workHours: Number(row.work_hours) || 0,
    startDate: formatDateLabel(row.start_date),
    startDateIso: toDateOnlyIso(row.start_date),
    endDate: row.end_date ? formatDateLabel(row.end_date) : '',
    endDateIso: row.end_date ? toDateOnlyIso(row.end_date) : '',
    baseSalary: formatCentsToMoney(baseSalaryCents),
    baseSalaryNum: baseSalaryCents / 100,
    gratification: formatCentsToMoney(gratificationCents),
    gratificationNum: gratificationCents / 100,
    afpName: row.afp_name?.trim() || '',
    afpRate: Number(row.afp_rate) || 0,
    healthInstitution: row.health_institution?.trim() || '',
    healthPlan: row.health_plan?.trim() || '',
    afcRate: Number(row.afc_rate) || 0,
    vacationAdjustmentDays: Number(row.vacation_adjustment_days) || 0,
    paydayDay: Number(row.payday_day) || 1,
    owner: row.owner_name?.trim() || '—',
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name?.trim() || '—',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name?.trim() || '—',
  }
}

export type WorkerVacationRow = {
  id: string
  worker_id: string
  start_date: Date | string | null
  end_date: Date | string | null
  days: string | number
  status: string
  notes: string | null
  created_at: Date
  created_by_name: string | null
}

export function mapVacationRow(row: WorkerVacationRow): WorkerVacationRequest {
  return {
    id: row.id,
    workerId: row.worker_id,
    startDate: formatDateLabel(row.start_date),
    startDateIso: toDateOnlyIso(row.start_date),
    endDate: formatDateLabel(row.end_date),
    endDateIso: toDateOnlyIso(row.end_date),
    days: Number(row.days) || 0,
    status: row.status,
    notes: row.notes?.trim() || '',
    createdAt: toIsoString(row.created_at),
    createdByName: row.created_by_name?.trim() || '—',
  }
}

export type WorkerPayrollRow = {
  id: string
  worker_id: string
  period_year: number | string
  period_month: number | string
  days_worked: string | number
  days_license: string | number
  days_absence: string | number
  days_vacation: string | number
  uf_value_cents: string | number
  earnings_json: unknown
  deductions_json: unknown
  taxable_base_cents: string | number
  tax_base_cents: string | number
  gross_cents: string | number
  net_cents: string | number
  overdraft_cents: string | number
  paid_at: Date | string | null
  pdf_path: string | null
  created_at: Date
  created_by_name: string | null
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function mapPayrollRow(row: WorkerPayrollRow): WorkerPayrollListItem {
  const year = Number(row.period_year)
  const month = Number(row.period_month)
  const grossCents = Number(row.gross_cents)
  const netCents = Number(row.net_cents)
  return {
    id: row.id,
    workerId: row.worker_id,
    periodYear: year,
    periodMonth: month,
    periodLabel: `${MONTHS_ES[month - 1] ?? month} ${year}`,
    daysWorked: Number(row.days_worked) || 0,
    daysLicense: Number(row.days_license) || 0,
    daysAbsence: Number(row.days_absence) || 0,
    daysVacation: Number(row.days_vacation) || 0,
    ufValueCents: Number(row.uf_value_cents) || 0,
    earnings: parseJsonArray<WorkerPayrollEarning>(row.earnings_json),
    deductions: parseJsonArray<WorkerPayrollDeduction>(row.deductions_json),
    taxableBaseCents: Number(row.taxable_base_cents) || 0,
    taxBaseCents: Number(row.tax_base_cents) || 0,
    grossCents,
    netCents,
    overdraftCents: Number(row.overdraft_cents) || 0,
    gross: formatCentsToMoney(grossCents),
    net: formatCentsToMoney(netCents),
    paidAt: row.paid_at ? toIsoString(row.paid_at) : null,
    pdfPath: row.pdf_path?.trim() || null,
    createdAt: toIsoString(row.created_at),
    createdByName: row.created_by_name?.trim() || '—',
  }
}
