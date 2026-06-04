import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ContactNote } from '@/data/contact-detail.mock'
import type { EntityNotesScope } from '@/lib/entity-notes-storage'
import type { NoteMention } from '@/lib/mentions'

const BASE = `${API_V1}/entity-notes`

export async function listEntityNotesApi(
  entityType: EntityNotesScope,
  entityId: string,
): Promise<ContactNote[]> {
  const res = await fetchJSON<{ data: ContactNote[] }>(
    `${BASE}?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
  )
  return res.data
}

export async function createEntityNoteApi(params: {
  entityType: EntityNotesScope
  entityId: string
  body: string
  mentions?: NoteMention[]
  author: string
  when: string
}): Promise<ContactNote> {
  const res = await fetchJSON<{ data: ContactNote }>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entityType: params.entityType,
      entityId: params.entityId,
      body: params.body,
      mentions: params.mentions,
    }),
  })
  return res.data
}

export async function deleteEntityNoteApi(noteId: string): Promise<void> {
  await fetchJSON(`${BASE}/${noteId}`, { method: 'DELETE' })
}
