export type BitacoraListItem = {
  id: string
  solicitudId: string
  solicitudCode: string
  solicitudTitle: string
  workDate: string
  hours: number
  description: string
  isBillable: boolean
  nonBillableReason: string | null
  assignedUserId: string
  assignedUserName: string
  companyId?: string
  companyName?: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type BitacoraDetail = BitacoraListItem

export type CreateBitacoraInput = {
  solicitudId: string
  workDate: string
  hours: number
  description?: string
  isBillable?: boolean
  nonBillableReason?: string
  assignedUserId: string
  assignedUserName?: string
}

export type UpdateBitacoraInput = Partial<CreateBitacoraInput>

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
