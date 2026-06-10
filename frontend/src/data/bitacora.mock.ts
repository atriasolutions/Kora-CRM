import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

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
} & RecordAuditFields

export type BitacoraDetail = BitacoraListItem

const bitacoraListSeedRaw: Omit<BitacoraListItem, keyof RecordAuditFields>[] = []

export const bitacoraListSeed = ensureRecordAuditList(
  bitacoraListSeedRaw,
  (item) => item.assignedUserName || '—',
)

export function resolveBitacoraListItem(id: string): BitacoraListItem {
  const direct = bitacoraListSeed.find((b) => b.id === id)
  if (direct) return { ...direct, id }
  return {
    id,
    solicitudId: '',
    solicitudCode: 'SOL-000',
    solicitudTitle: 'Solicitud',
    workDate: new Date().toISOString().slice(0, 10),
    hours: 1,
    description: '',
    isBillable: true,
    nonBillableReason: null,
    assignedUserId: '',
    assignedUserName: '—',
    createdAt: '',
    createdById: '',
    createdByName: '',
    updatedAt: '',
    updatedById: '',
    updatedByName: '',
  }
}
