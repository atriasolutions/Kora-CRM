import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { BitacoraFilters } from '@/lib/bitacora-filters'
import {
  bitacoraRowMatchesDateFilter,
  labelForBitacoraDateFilter,
  resolveBitacoraDateBounds,
} from '@/lib/bitacora-date-filter'
import type {
  BitacoraDashboardStats,
  BitacoraDashboardCompanyPoint,
  BitacoraDashboardMonthPoint,
  BitacoraDashboardSolicitudPoint,
  BitacoraDashboardUserPoint,
} from '@/types/bitacora-dashboard'

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function roundHours(value: number): number {
  return Math.round(value * 10) / 10
}

function monthLabelFromKey(key: string): string {
  const [year, month] = key.split('-')
  const monthIndex = Number.parseInt(month ?? '', 10) - 1
  if (!year || monthIndex < 0 || monthIndex > 11) return key
  return `${MONTH_LABELS[monthIndex]} ${year}`
}

function matchesDashboardFilters(
  row: BitacoraListItem,
  filters: BitacoraFilters,
): boolean {
  if (!bitacoraRowMatchesDateFilter(row.workDate, filters.date)) return false
  if (filters.companyId.trim()) {
    if (row.companyId) return row.companyId === filters.companyId.trim()
    return (
      row.companyName?.trim().toLowerCase() ===
      filters.companyName.trim().toLowerCase()
    )
  }
  return true
}

export function computeBitacoraDashboardStats(
  rows: BitacoraListItem[],
  filters: BitacoraFilters,
): BitacoraDashboardStats {
  const filtered = rows.filter((row) => matchesDashboardFilters(row, filters))

  let billableHours = 0
  let nonBillableHours = 0
  const monthMap = new Map<string, BitacoraDashboardMonthPoint>()
  const solicitudMap = new Map<string, BitacoraDashboardSolicitudPoint>()
  const companyMap = new Map<string, BitacoraDashboardCompanyPoint>()
  const userMap = new Map<string, BitacoraDashboardUserPoint>()

  for (const row of filtered) {
    const hours = Number(row.hours) || 0
    if (row.isBillable) billableHours += hours
    else nonBillableHours += hours

    const monthKey = row.workDate.slice(0, 7)
    if (monthKey.length === 7) {
      const currentMonth = monthMap.get(monthKey) ?? {
        key: monthKey,
        label: monthLabelFromKey(monthKey),
        billableHours: 0,
        nonBillableHours: 0,
        totalHours: 0,
      }
      if (row.isBillable) currentMonth.billableHours += hours
      else currentMonth.nonBillableHours += hours
      currentMonth.totalHours = currentMonth.billableHours + currentMonth.nonBillableHours
      monthMap.set(monthKey, currentMonth)
    }

    const solicitudKey = row.solicitudId || row.solicitudCode
    const currentSolicitud = solicitudMap.get(solicitudKey) ?? {
      solicitudId: row.solicitudId,
      code: row.solicitudCode,
      title: row.solicitudTitle,
      billableHours: 0,
      nonBillableHours: 0,
      totalHours: 0,
    }
    if (row.isBillable) currentSolicitud.billableHours += hours
    else currentSolicitud.nonBillableHours += hours
    currentSolicitud.totalHours =
      currentSolicitud.billableHours + currentSolicitud.nonBillableHours
    solicitudMap.set(solicitudKey, currentSolicitud)

    if (!filters.companyId.trim() && row.companyId && row.companyName?.trim()) {
      const currentCompany = companyMap.get(row.companyId) ?? {
        companyId: row.companyId,
        companyName: row.companyName.trim(),
        billableHours: 0,
        nonBillableHours: 0,
        totalHours: 0,
      }
      if (row.isBillable) currentCompany.billableHours += hours
      else currentCompany.nonBillableHours += hours
      currentCompany.totalHours =
        currentCompany.billableHours + currentCompany.nonBillableHours
      companyMap.set(row.companyId, currentCompany)
    }

    const userKey = row.assignedUserId || row.assignedUserName.trim() || '—'
    const currentUser = userMap.get(userKey) ?? {
      assignedUserId: row.assignedUserId,
      assignedUserName: row.assignedUserName.trim() || '—',
      billableHours: 0,
      nonBillableHours: 0,
      totalHours: 0,
      entryCount: 0,
    }
    if (row.isBillable) currentUser.billableHours += hours
    else currentUser.nonBillableHours += hours
    currentUser.totalHours = currentUser.billableHours + currentUser.nonBillableHours
    currentUser.entryCount += 1
    userMap.set(userKey, currentUser)
  }

  billableHours = roundHours(billableHours)
  nonBillableHours = roundHours(nonBillableHours)
  const totalHours = roundHours(billableHours + nonBillableHours)
  const billableSharePercent =
    totalHours > 0 ? Math.round((billableHours / totalHours) * 1000) / 10 : 0

  return {
    billableHours,
    nonBillableHours,
    totalHours,
    entryCount: filtered.length,
    billableSharePercent,
    periodLabel: labelForBitacoraDateFilter(filters.date),
    companyName: filters.companyName.trim() || undefined,
    byMonth: [...monthMap.values()]
      .map((point) => ({
        ...point,
        billableHours: roundHours(point.billableHours),
        nonBillableHours: roundHours(point.nonBillableHours),
        totalHours: roundHours(point.totalHours),
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    bySolicitud: [...solicitudMap.values()]
      .map((point) => ({
        ...point,
        billableHours: roundHours(point.billableHours),
        nonBillableHours: roundHours(point.nonBillableHours),
        totalHours: roundHours(point.totalHours),
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 8),
    byCompany: [...companyMap.values()]
      .map((point) => ({
        ...point,
        billableHours: roundHours(point.billableHours),
        nonBillableHours: roundHours(point.nonBillableHours),
        totalHours: roundHours(point.totalHours),
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 6),
    byUser: [...userMap.values()]
      .map((point) => ({
        ...point,
        billableHours: roundHours(point.billableHours),
        nonBillableHours: roundHours(point.nonBillableHours),
        totalHours: roundHours(point.totalHours),
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 12),
  }
}

export type BitacoraDashboardQuery = {
  mine?: 'true'
  workDateFrom?: string
  workDateTo?: string
  companyId?: string
}

export function bitacoraFiltersToDashboardQuery(
  filters: BitacoraFilters,
  mineOnly = false,
): BitacoraDashboardQuery {
  const query: BitacoraDashboardQuery = {}
  if (mineOnly) query.mine = 'true'

  const bounds = resolveBitacoraDateBounds(filters.date)
  if (bounds.from) query.workDateFrom = bounds.from
  if (bounds.to) query.workDateTo = bounds.to

  const companyId = filters.companyId.trim()
  if (companyId) query.companyId = companyId

  return query
}

export function bitacoraDashboardResetKey(
  filters: BitacoraFilters,
  listScope: string,
): string {
  const bounds = resolveBitacoraDateBounds(filters.date)
  return [listScope, bounds.from ?? '', bounds.to ?? '', filters.companyId.trim()].join('|')
}
