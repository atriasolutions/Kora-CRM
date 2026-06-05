import { formatChileDateTimeLabel } from '@/lib/chile-timezone'
import {
  findUserInDisplayCacheByName,
  getUserFromDisplayCache,
} from '@/lib/user-display-cache'
import { getCurrentUser } from '@/lib/current-user'

export type RecordAuditFields = {
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type RecordAuditPartial = Partial<RecordAuditFields>

const MONTHS_ES: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
}

export function auditNowIso(): string {
  return new Date().toISOString()
}

export function resolveUserIdByName(name?: string | null): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return getCurrentUser().id
  const byName = findUserInDisplayCacheByName(trimmed)
  if (byName) return byName.id
  const current = getCurrentUser()
  if (trimmed.toLowerCase() === current.name.toLowerCase()) return current.id
  return ''
}

export function resolveUserDisplay(
  userId: string,
  fallbackName?: string,
): { id: string; name: string; email?: string } {
  const cached = getUserFromDisplayCache(userId)
  if (userId && cached) {
    return { id: cached.id, name: cached.name, email: cached.email }
  }

  const current = getCurrentUser()
  if (userId && userId === current.id) {
    return { id: current.id, name: current.name, email: current.email }
  }

  if (fallbackName?.trim()) {
    const byName = findUserInDisplayCacheByName(fallbackName)
    if (byName) {
      return { id: byName.id, name: byName.name, email: byName.email }
    }
    const resolvedId = userId || resolveUserIdByName(fallbackName)
    if (resolvedId) {
      const cachedResolved = getUserFromDisplayCache(resolvedId)
      return {
        id: resolvedId,
        name: fallbackName.trim(),
        email: cachedResolved?.email,
      }
    }
    return { id: '', name: fallbackName.trim() }
  }

  if (userId) {
    return { id: userId, name: userId }
  }

  return { id: '', name: '—' }
}

function parseLegacyDisplayDate(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 3) {
    const day = Number.parseInt(parts[0] ?? '', 10)
    const monthKey = (parts[1] ?? '').replace(/\./g, '').toLowerCase().slice(0, 3)
    const year = Number.parseInt(parts[2] ?? '', 10)
    const month = MONTHS_ES[monthKey]
    if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
      const d = new Date(year, month, day, 12, 0, 0)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }
  const fallback = new Date(trimmed)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** Muestra fecha-hora de auditoría en es-CL; tolera ISO y texto legacy. */
export function formatAuditDateTime(value: string | undefined | null): string {
  if (!value?.trim()) return '—'
  const d = parseLegacyDisplayDate(value)
  if (!d) return value
  return formatChileDateTimeLabel(d)
}

export function stampRecordAuditOnCreate<T extends object>(
  item: T,
  auditPartial?: RecordAuditPartial,
): T & RecordAuditFields {
  const now = auditNowIso()
  const userId = auditPartial?.createdById ?? getCurrentUser().id
  const userName =
    auditPartial?.createdByName ??
    resolveUserDisplay(userId).name ??
    getCurrentUser().name
  const audit: RecordAuditFields = {
    createdAt: auditPartial?.createdAt ?? now,
    createdById: userId,
    createdByName: userName,
    updatedAt: auditPartial?.updatedAt ?? now,
    updatedById: auditPartial?.updatedById ?? userId,
    updatedByName: auditPartial?.updatedByName ?? userName,
  }
  return { ...item, ...audit }
}

export function stampRecordAuditOnUpdate<T extends RecordAuditPartial>(
  record: T,
): T & RecordAuditFields {
  const now = auditNowIso()
  const userId = getCurrentUser().id
  const userName = getCurrentUser().name
  return {
    ...record,
    createdAt: record.createdAt ?? now,
    createdById: record.createdById ?? userId,
    createdByName: record.createdByName ?? userName,
    updatedAt: now,
    updatedById: userId,
    updatedByName: userName,
  }
}

/** Rellena auditoría en seeds demo a partir de owner/manager. */
export function seedAuditFromOwner(
  ownerName?: string | null,
  legacyCreatedAt?: string,
): RecordAuditFields {
  const userId = resolveUserIdByName(ownerName)
  const name = ownerName?.trim() || getCurrentUser().name
  const created = legacyCreatedAt
    ? parseLegacyDisplayDate(legacyCreatedAt)?.toISOString() ?? auditNowIso()
    : auditNowIso()
  return {
    createdAt: created,
    createdById: userId,
    createdByName: name,
    updatedAt: created,
    updatedById: userId,
    updatedByName: name,
  }
}
