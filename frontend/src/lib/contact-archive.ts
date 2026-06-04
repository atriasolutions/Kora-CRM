import type { ContactListItem } from '@/data/contacts.mock'

/** Días en papelera antes de eliminación automática. */
export const CONTACT_ARCHIVE_RETENTION_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ArchivedContactRecord = {
  id: string
  archivedAt: number
  /** Copia para restaurar (contactos de usuario o estado al archivar). */
  snapshot?: ContactListItem
}

export type ArchivedContactStore = Record<string, ArchivedContactRecord>

export function archivedContactIds(store: ArchivedContactStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isContactArchived(id: string, store: ArchivedContactStore): boolean {
  return Boolean(store[id])
}

export function archiveRetentionMs(): number {
  return CONTACT_ARCHIVE_RETENTION_DAYS * MS_PER_DAY
}

export function purgeDeadline(archivedAt: number): number {
  return archivedAt + archiveRetentionMs()
}

export function isArchiveExpired(archivedAt: number, now = Date.now()): boolean {
  return now >= purgeDeadline(archivedAt)
}

export function daysUntilPurge(archivedAt: number, now = Date.now()): number {
  const remaining = purgeDeadline(archivedAt) - now
  return Math.max(0, Math.ceil(remaining / MS_PER_DAY))
}

export function formatArchivePurgeLabel(archivedAt: number, now = Date.now()): string {
  const days = daysUntilPurge(archivedAt, now)
  if (days === 0) return 'Se eliminará hoy'
  if (days === 1) return '1 día para eliminación definitiva'
  return `${days} días para eliminación definitiva`
}

export function formatArchivedAt(archivedAt: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(archivedAt))
}

/** Elimina registros que superaron los 30 días en papelera. */
export function purgeExpiredFromStore(
  store: ArchivedContactStore,
  now = Date.now(),
): { store: ArchivedContactStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedContactStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
