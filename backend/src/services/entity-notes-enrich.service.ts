import { getUserNamesByIds } from '../repositories/mentions.repository.js'
import type { EntityNoteDto } from '../types/entity-note.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function refreshUserMentionsInHtml(
  html: string,
  namesById: Map<string, string>,
): string {
  if (!html.includes('data-type="mention"') || namesById.size === 0) return html

  return html.replace(
    /<span([^>]*data-type="mention"[^>]*)>([^<]*)<\/span>/gi,
    (full, attrs: string, inner: string) => {
      const kindMatch = attrs.match(/data-mention-kind="([^"]+)"/i)
      const idMatch = attrs.match(/data-id="([^"]+)"/i)
      if (!kindMatch || kindMatch[1] !== 'user' || !idMatch) return full

      const rawId = idMatch[1]!
      const recordId = rawId.includes(':') ? rawId.split(':').slice(1).join(':') : rawId
      if (!UUID_RE.test(recordId)) return full

      const currentName = namesById.get(recordId)
      if (!currentName) return full

      let nextAttrs = attrs.replace(
        /data-label="[^"]*"/i,
        `data-label="${currentName.replace(/"/g, '&quot;')}"`,
      )
      if (!/data-label="/i.test(nextAttrs)) {
        nextAttrs += ` data-label="${currentName.replace(/"/g, '&quot;')}"`
      }

      const prefix = inner.startsWith('@') ? '@' : ''
      return `<span${nextAttrs}>${prefix}${currentName}</span>`
    },
  )
}

function collectUserIds(notes: EntityNoteDto[]): string[] {
  const ids = new Set<string>()
  for (const note of notes) {
    for (const mention of note.mentions ?? []) {
      if (mention.kind !== 'user') continue
      if (UUID_RE.test(mention.recordId)) ids.add(mention.recordId)
    }

    const docMatches = note.body.matchAll(/data-id="user:([^"]+)"/gi)
    for (const match of docMatches) {
      const recordId = match[1]!
      if (UUID_RE.test(recordId)) ids.add(recordId)
    }
  }
  return [...ids]
}

export async function enrichEntityNotes(notes: EntityNoteDto[]): Promise<EntityNoteDto[]> {
  if (notes.length === 0) return notes

  const userIds = collectUserIds(notes)
  const namesById = await getUserNamesByIds(userIds)
  if (namesById.size === 0) return notes

  return notes.map((note) => {
    const mentions = note.mentions?.map((mention) => {
      if (mention.kind !== 'user' || !UUID_RE.test(mention.recordId)) return mention
      const currentName = namesById.get(mention.recordId)
      return currentName ? { ...mention, label: currentName } : mention
    })

    return {
      ...note,
      body: refreshUserMentionsInHtml(note.body, namesById),
      mentions,
    }
  })
}
