import { stampRecordAuditOnCreate, stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type {
  WorkerContractType,
  WorkerDetail,
  WorkerListItem,
  WorkerStatus,
} from '@/data/workers.mock'
import type { WorkerApiBody } from '@/api/workers'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { formatWorkerAmount, parseWorkerAmountNum } from '@/lib/worker-display'
import { formatPurchaseDisplayDate } from '@/lib/purchase-dates'

export type WorkerFormValues = {
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
  workHours: string
  startDate: string
  endDate: string
  baseSalary: string
  gratification: string
  afpName: string
  afpRate: string
  healthInstitution: string
  healthPlan: string
  afcRate: string
  vacationAdjustmentDays: string
  paydayDay: string
  ownerName: string
}

export function createDefaultWorkerFormValues(
  partial?: Partial<WorkerFormValues>,
): WorkerFormValues {
  return {
    number: '',
    fullName: '',
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
    workHours: '45',
    startDate: formatPurchaseDisplayDate(new Date()),
    endDate: '',
    baseSalary: '$0',
    gratification: '$0',
    afpName: '',
    afpRate: '11.44',
    healthInstitution: '',
    healthPlan: '',
    afcRate: '0.6',
    vacationAdjustmentDays: '0',
    paydayDay: '5',
    ownerName: getDefaultOwnerName(),
    ...partial,
  }
}

export function validateWorkerForm(values: WorkerFormValues): string | null {
  if (!values.fullName.trim()) return 'Indica el nombre del trabajador.'
  const payday = Number.parseInt(values.paydayDay, 10)
  if (Number.isFinite(payday) && (payday < 1 || payday > 28)) {
    return 'El día de pago debe estar entre 1 y 28.'
  }
  return null
}

function num(value: string): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

export function workerFormToApiBody(values: WorkerFormValues): WorkerApiBody {
  return {
    number: values.number.trim() || undefined,
    fullName: values.fullName.trim(),
    taxId: values.taxId.trim() || undefined,
    email: values.email.trim() || undefined,
    phone: values.phone.trim() || undefined,
    address: values.address.trim() || undefined,
    avatarUrl: values.avatarUrl.trim() || undefined,
    jobTitle: values.jobTitle.trim() || undefined,
    businessUnit: values.businessUnit.trim() || undefined,
    jobFunctions: values.jobFunctions.trim() || undefined,
    status: values.status,
    contractType: values.contractType,
    workHours: Number.parseInt(values.workHours, 10) || 0,
    startDate: values.startDate.trim() || undefined,
    endDate: values.endDate.trim() || null,
    baseSalaryNum: parseWorkerAmountNum(values.baseSalary),
    gratificationNum: parseWorkerAmountNum(values.gratification),
    afpName: values.afpName.trim() || undefined,
    afpRate: num(values.afpRate),
    healthInstitution: values.healthInstitution.trim() || undefined,
    healthPlan: values.healthPlan.trim() || undefined,
    afcRate: num(values.afcRate),
    vacationAdjustmentDays: num(values.vacationAdjustmentDays),
    paydayDay: Number.parseInt(values.paydayDay, 10) || 5,
    ownerName: values.ownerName.trim() || undefined,
  }
}

export function workerDetailToFormValues(worker: WorkerDetail | WorkerListItem): WorkerFormValues {
  return {
    number: worker.number,
    fullName: worker.fullName,
    taxId: worker.taxId,
    email: worker.email,
    phone: worker.phone,
    address: worker.address,
    avatarUrl: worker.avatarUrl,
    jobTitle: worker.jobTitle,
    businessUnit: worker.businessUnit,
    jobFunctions: worker.jobFunctions,
    status: worker.status,
    contractType: worker.contractType,
    workHours: String(worker.workHours ?? 45),
    startDate: worker.startDate,
    endDate: worker.endDate,
    baseSalary: worker.baseSalary,
    gratification: worker.gratification,
    afpName: worker.afpName,
    afpRate: String(worker.afpRate ?? ''),
    healthInstitution: worker.healthInstitution,
    healthPlan: worker.healthPlan,
    afcRate: String(worker.afcRate ?? ''),
    vacationAdjustmentDays: String(worker.vacationAdjustmentDays ?? 0),
    paydayDay: String(worker.paydayDay ?? 5),
    ownerName: worker.owner,
  }
}

export function createWorkerId(): string {
  return `trabajador-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Fila para el registry en modo local (sin API). */
export function formValuesToWorkerListItem(
  values: WorkerFormValues,
  id = createWorkerId(),
): WorkerListItem {
  const baseSalaryNum = parseWorkerAmountNum(values.baseSalary)
  const gratificationNum = parseWorkerAmountNum(values.gratification)
  return stampRecordAuditOnCreate({
    id,
    number: values.number.trim() || `TRB-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    fullName: values.fullName.trim() || 'Sin nombre',
    taxId: values.taxId.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    avatarUrl: values.avatarUrl.trim(),
    jobTitle: values.jobTitle.trim(),
    businessUnit: values.businessUnit.trim(),
    jobFunctions: values.jobFunctions.trim(),
    status: values.status,
    contractType: values.contractType,
    workHours: Number.parseInt(values.workHours, 10) || 0,
    startDate: values.startDate.trim() || '—',
    endDate: values.endDate.trim(),
    baseSalary: formatWorkerAmount(baseSalaryNum),
    baseSalaryNum,
    gratification: formatWorkerAmount(gratificationNum),
    gratificationNum,
    afpName: values.afpName.trim(),
    afpRate: num(values.afpRate),
    healthInstitution: values.healthInstitution.trim(),
    healthPlan: values.healthPlan.trim(),
    afcRate: num(values.afcRate),
    vacationAdjustmentDays: num(values.vacationAdjustmentDays),
    paydayDay: Number.parseInt(values.paydayDay, 10) || 5,
    owner: values.ownerName.trim(),
  })
}

export function listItemFromWorkerDetail(worker: WorkerDetail): WorkerListItem {
  const { vacationSummary: _v, vacations: _va, payrolls: _p, notes: _n, files: _f, ...rest } = worker
  return stampRecordAuditOnUpdate({ ...rest })
}
