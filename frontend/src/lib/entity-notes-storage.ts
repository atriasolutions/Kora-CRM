import { isApiEnabled } from '@/api/config'
import {
  createEntityNoteApi,
  deleteEntityNoteApi,
  listEntityNotesApi,
} from '@/api/entity-notes'
import { STORAGE_PREFIX } from '@/config/brand'
import type { ContactNote } from '@/data/contact-detail.mock'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-entity-notes`

export type EntityNotesScope =
  | 'contacto'
  | 'empresa'
  | 'oportunidad'
  | 'cotizacion'
  | 'factura'
  | 'compra'
  | 'producto'
  | 'inventario'
  | 'recepcion'
  | 'actividad'
  | 'proyecto'
  | 'usuario'

function storageKey(scope: EntityNotesScope, entityId: string): string {
  return `${scope}:${entityId.trim()}`
}

function readAll(): Record<string, ContactNote[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ContactNote[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, ContactNote[]>) {
  if (!isApiEnabled()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* quota */
    }
  }
}

export function loadEntityNotesLocal(
  scope: EntityNotesScope,
  entityId: string,
): ContactNote[] | null {
  const entry = readAll()[storageKey(scope, entityId)]
  return entry && Array.isArray(entry) ? entry : null
}

export function persistEntityNotesLocal(
  scope: EntityNotesScope,
  entityId: string,
  notes: ContactNote[],
) {
  const all = readAll()
  all[storageKey(scope, entityId)] = notes
  writeAll(all)
}

export function removeEntityNotesLocal(scope: EntityNotesScope, entityId: string) {
  const all = readAll()
  const key = storageKey(scope, entityId)
  if (!all[key]) return
  delete all[key]
  writeAll(all)
}

/** Elimina todas las notas de un registro (p. ej. borrado permanente). */
export async function removeEntityNotes(
  scope: EntityNotesScope,
  entityId: string,
): Promise<void> {
  if (isApiEnabled()) {
    try {
      const notes = await listEntityNotesApi(scope, entityId)
      await Promise.all(notes.map((n) => deleteEntityNoteApi(n.id)))
    } catch {
      /* ignore */
    }
    return
  }
  removeEntityNotesLocal(scope, entityId)
}

/** Solo modo mock: lectura síncrona desde localStorage. */
export function mergeEntityNotesForMock(
  scope: EntityNotesScope,
  entityId: string,
  seedNotes: ContactNote[],
): ContactNote[] {
  return loadEntityNotesLocal(scope, entityId) ?? seedNotes
}

/** Notas desde API o localStorage (modo mock). */
export async function mergeEntityNotes(
  scope: EntityNotesScope,
  entityId: string,
  seedNotes: ContactNote[],
): Promise<ContactNote[]> {
  if (isApiEnabled()) {
    try {
      return await listEntityNotesApi(scope, entityId)
    } catch {
      return []
    }
  }
  return loadEntityNotesLocal(scope, entityId) ?? seedNotes
}

export async function appendEntityNote(
  scope: EntityNotesScope,
  entityId: string,
  note: ContactNote,
  currentNotes: ContactNote[],
): Promise<ContactNote[]> {
  if (isApiEnabled()) {
    await createEntityNoteApi({
      entityType: scope,
      entityId,
      body: note.body,
      mentions: note.mentions,
      author: note.author,
      when: note.when,
    })
    return listEntityNotesApi(scope, entityId)
  }
  const next = [note, ...currentNotes]
  persistEntityNotesLocal(scope, entityId, next)
  return next
}

export async function removeEntityNoteById(
  scope: EntityNotesScope,
  entityId: string,
  noteId: string,
  currentNotes: ContactNote[],
): Promise<ContactNote[]> {
  if (isApiEnabled()) {
    await deleteEntityNoteApi(noteId)
    return currentNotes.filter((n) => n.id !== noteId)
  }
  const next = currentNotes.filter((n) => n.id !== noteId)
  persistEntityNotesLocal(scope, entityId, next)
  return next
}

/** @deprecated usar removeEntityNoteById */
export function persistEntityNotes(
  scope: EntityNotesScope,
  entityId: string,
  notes: ContactNote[],
) {
  persistEntityNotesLocal(scope, entityId, notes)
}

/** @deprecated usar removeEntityNoteById */
export function removeEntityNote(
  scope: EntityNotesScope,
  entityId: string,
  noteId: string,
  currentNotes: ContactNote[],
): ContactNote[] {
  const next = currentNotes.filter((n) => n.id !== noteId)
  persistEntityNotesLocal(scope, entityId, next)
  return next
}
