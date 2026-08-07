import { useCallback } from 'react'
import { flushSync } from 'react-dom'

import type { ContactNote } from '@/data/contact-detail.mock'
import { apiActionErrorMessage } from '@/api/errors'
import {
  appendEntityNote,
  removeEntityNoteById,
  type EntityNotesScope,
} from '@/lib/entity-notes-storage'
import { toast } from '@/lib/toast'

type UseEntityNotesOptions<T extends { notes: ContactNote[] }> = {
  scope: EntityNotesScope
  entityId: string | undefined
  setRecord: React.Dispatch<React.SetStateAction<T | null>>
  /** Tras guardar o borrar (p. ej. sincronizar registro en el registry). */
  onAfterChange?: (next: T) => void
  /** Tras agregar una nota (p. ej. cambiar de pestaña). */
  onAdded?: () => void
}

export function useEntityNotes<T extends { notes: ContactNote[] }>({
  scope,
  entityId,
  setRecord,
  onAfterChange,
  onAdded,
}: UseEntityNotesOptions<T>) {
  const onAddNote = useCallback(
    (note: ContactNote) => {
      if (!entityId) return
      void (async () => {
        let priorNotes: ContactNote[] = []
        // flushSync: el snapshot debe existir antes del await (si no, priorNotes puede quedar [])
        flushSync(() => {
          setRecord((prev) => {
            if (!prev) return prev
            priorNotes = prev.notes
            return { ...prev, notes: [note, ...prev.notes] } as T
          })
        })
        try {
          const notes = await appendEntityNote(scope, entityId, note, priorNotes)
          setRecord((prev) => {
            if (!prev) return prev
            const next = { ...prev, notes } as T
            onAfterChange?.(next)
            return next
          })
          onAdded?.()
        } catch (error) {
          setRecord((prev) => {
            if (!prev) return prev
            return { ...prev, notes: priorNotes } as T
          })
          toast.error(apiActionErrorMessage(error, 'No se pudo guardar la nota.'))
        }
      })()
    },
    [scope, entityId, setRecord, onAfterChange, onAdded],
  )

  const onDeleteNote = useCallback(
    (noteId: string) => {
      if (!entityId) return
      void (async () => {
        let priorNotes: ContactNote[] = []
        flushSync(() => {
          setRecord((prev) => {
            if (!prev) return prev
            priorNotes = prev.notes
            return {
              ...prev,
              notes: prev.notes.filter((n) => n.id !== noteId),
            } as T
          })
        })
        try {
          const notes = await removeEntityNoteById(
            scope,
            entityId,
            noteId,
            priorNotes,
          )
          setRecord((prev) => {
            if (!prev) return prev
            const next = { ...prev, notes } as T
            onAfterChange?.(next)
            return next
          })
        } catch (error) {
          setRecord((prev) => {
            if (!prev) return prev
            return { ...prev, notes: priorNotes } as T
          })
          toast.error(apiActionErrorMessage(error, 'No se pudo eliminar la nota.'))
        }
      })()
    },
    [scope, entityId, setRecord, onAfterChange],
  )

  return { onAddNote, onDeleteNote }
}
