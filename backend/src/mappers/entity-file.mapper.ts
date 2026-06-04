import type { EntityFileDto } from '../types/entity-file.js'

export type EntityFileRow = {
  id: string
  entity_type: string
  entity_id: string
  entity_label_snapshot: string
  file_name: string
  size_bytes: string | number | null
  mime_type: string | null
  storage_key: string
  uploaded_at: Date
  uploaded_by_id: string | null
  uploaded_by_name: string | null
}

function formatUploadedAt(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function mapEntityFileRow(row: EntityFileRow): EntityFileDto {
  const storage = row.storage_key ?? ''
  const dataUrl = storage.startsWith('data:') ? storage : undefined

  return {
    id: row.id,
    name: row.file_name,
    size: Number(row.size_bytes ?? 0),
    mimeType: row.mime_type ?? undefined,
    uploadedAt: formatUploadedAt(row.uploaded_at),
    uploadedBy: row.uploaded_by_name?.trim() || '—',
    dataUrl,
  }
}
