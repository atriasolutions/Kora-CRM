import type { EntityNoteDto, EntityNoteMentionDto } from '../types/entity-note.js'

export type EntityNoteRow = {
  id: string
  entity_type: string
  entity_id: string
  body: string
  mentions: unknown
  author_user_id: string | null
  author_name: string
  created_at: Date
}

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function parseMentions(raw: unknown): EntityNoteMentionDto[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: EntityNoteMentionDto[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const kind = typeof row.kind === 'string' ? row.kind : ''
    const recordId = typeof row.recordId === 'string' ? row.recordId : ''
    const label = typeof row.label === 'string' ? row.label : ''
    if (!kind || !recordId || !label) continue
    out.push({ kind, recordId, label })
  }
  return out.length > 0 ? out : undefined
}

export function mapEntityNoteRow(row: EntityNoteRow): EntityNoteDto {
  return {
    id: row.id,
    body: row.body,
    mentions: parseMentions(row.mentions),
    author: row.author_name?.trim() || '—',
    authorUserId: row.author_user_id,
    when: formatWhen(row.created_at),
  }
}
