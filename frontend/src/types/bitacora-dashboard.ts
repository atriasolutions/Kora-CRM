export type BitacoraDashboardMonthPoint = {
  key: string
  label: string
  billableHours: number
  nonBillableHours: number
  totalHours: number
}

export type BitacoraDashboardSolicitudPoint = {
  solicitudId: string
  code: string
  title: string
  billableHours: number
  nonBillableHours: number
  totalHours: number
}

export type BitacoraDashboardCompanyPoint = {
  companyId: string
  companyName: string
  billableHours: number
  nonBillableHours: number
  totalHours: number
}

export type BitacoraDashboardUserPoint = {
  assignedUserId: string
  assignedUserName: string
  billableHours: number
  nonBillableHours: number
  totalHours: number
  entryCount: number
}

export type BitacoraDashboardStats = {
  billableHours: number
  nonBillableHours: number
  totalHours: number
  entryCount: number
  billableSharePercent: number
  periodLabel: string
  companyName?: string
  byMonth: BitacoraDashboardMonthPoint[]
  bySolicitud: BitacoraDashboardSolicitudPoint[]
  byCompany: BitacoraDashboardCompanyPoint[]
  byUser: BitacoraDashboardUserPoint[]
}

export const BITACORA_BILLABLE_CHART_COLOR = 'hsl(217 91% 55%)'
export const BITACORA_NON_BILLABLE_CHART_COLOR = 'hsl(38 92% 50%)'
