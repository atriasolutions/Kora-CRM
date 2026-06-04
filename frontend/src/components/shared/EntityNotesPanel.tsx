import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { MentionChipsList } from '@/components/shared/MentionChipsList'
import { RichTextContent } from '@/components/shared/rich-text/RichTextContent'
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContactNote } from '@/data/contact-detail.mock'
import {
  extractMentionsFromHtml,
  isNoteContentEmpty,
  resolveMentionLabel,
} from '@/lib/mentions'
import { sanitizeRichTextHtml } from '@/lib/rich-text-sanitize'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/contexts/notifications-context'
import { isApiEnabled } from '@/api/config'
import { sendMentionNotificationsApi } from '@/api/notifications'

type EntityNotesPanelProps = {
  notes: ContactNote[]
  authorName: string
  disabled?: boolean
  onAddNote?: (note: ContactNote) => void
  onDeleteNote?: (noteId: string) => void
}

function formatNoteWhen(): string {
  const now = new Date()
  return now.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EntityNotesPanel({
  notes,
  authorName,
  disabled = false,
  onAddNote,
  onDeleteNote,
}: EntityNotesPanelProps) {
  const [draftHtml, setDraftHtml] = useState('')
  const { session } = useAuth()
  const { addLocalNotification } = useNotifications()
  const notifiedNoteIdsRef = useRef<Set<string>>(new Set())

  const myMentionRecordId = useMemo(() => {
    if (isApiEnabled()) return session?.userId?.trim() || null
    const name = session?.name?.trim()
    if (!name) return null
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, '-')
  }, [session?.name, session?.userId])

  useEffect(() => {
    if (isApiEnabled()) return
    if (!myMentionRecordId) return
    if (notifiedNoteIdsRef.current.size === 0) {
      notes.forEach((n) => notifiedNoteIdsRef.current.add(n.id))
      return
    }
    for (const note of notes) {
      if (notifiedNoteIdsRef.current.has(note.id)) continue

      const mentions = note.mentions ?? extractMentionsFromHtml(note.body)
      const mentionMe = mentions.some(
        (m) =>
          m.kind === 'user' &&
          (m.recordId === myMentionRecordId ||
            m.label.toLowerCase() === session?.name?.trim().toLowerCase()),
      )
      if (!mentionMe) continue

      notifiedNoteIdsRef.current.add(note.id)
      addLocalNotification({
        type: 'mention',
        title: 'Te mencionaron en una nota',
        message: `En la nota se te mencionó: ${note.author}.`,
        href: window.location.pathname,
        sourceKey: `mention:${window.location.pathname}:${note.id}:${myMentionRecordId}`,
      })
    }
  }, [notes, myMentionRecordId, session?.name, addLocalNotification])

  const handleSave = () => {
    if (isNoteContentEmpty(draftHtml)) return
    const body = sanitizeRichTextHtml(draftHtml)
    const mentions = extractMentionsFromHtml(body)
    const note: ContactNote = {
      id: `note-${Date.now()}`,
      body,
      mentions,
      author: session?.name?.trim() || authorName,
      when: formatNoteWhen(),
    }
    onAddNote?.(note)
    const mentionedUserIds = [
      ...new Set(
        mentions
          .filter((m) => m.kind === 'user' && /^[0-9a-f-]{36}$/i.test(m.recordId))
          .map((m) => m.recordId),
      ),
    ]
    const mentionedUserNames = [
      ...new Set(
        mentions
          .filter((m) => m.kind === 'user' && !/^[0-9a-f-]{36}$/i.test(m.recordId))
          .map((m) => m.label.trim())
          .filter(Boolean),
      ),
    ]
    if (
      (mentionedUserIds.length > 0 || mentionedUserNames.length > 0) &&
      isApiEnabled()
    ) {
      void sendMentionNotificationsApi({
        mentionedUserIds:
          mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        mentionedUserNames:
          mentionedUserNames.length > 0 ? mentionedUserNames : undefined,
        href: window.location.pathname,
      }).catch(() => {
        // no bloquear guardado de nota por falla de notificación
      })
    }
    setDraftHtml('')
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Notas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <RichTextEditor
            value={draftHtml}
            disabled={disabled}
            onChange={setDraftHtml}
            placeholder="Escribe una nota… @ para mencionar o pega la URL de un registro del CRM."
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={disabled}
              onClick={() => setDraftHtml('')}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={disabled || isNoteContentEmpty(draftHtml)}
              onClick={handleSave}
            >
              Guardar nota
            </Button>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no hay notas en este registro.
          </p>
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => {
              const mentions =
                note.mentions ??
                extractMentionsFromHtml(note.body).map((m) => ({
                  ...m,
                  label: m.label || resolveMentionLabel(m.id),
                }))

              return (
                <li
                  key={note.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  {onDeleteNote ? (
                    <div className="mb-2 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label="Eliminar nota"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                  <RichTextContent html={note.body} />
                  <MentionChipsList mentions={mentions} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {note.author} · {note.when}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
