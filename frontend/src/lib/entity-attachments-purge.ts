import {
  removeEntityFilesLocal,
  type EntityFilesScope,
} from '@/lib/entity-files-storage'
import {
  removeEntityNotes,
  type EntityNotesScope,
} from '@/lib/entity-notes-storage'

/** Limpia notas y archivos locales/API asociados a un registro eliminado. */
export function purgeEntityAttachments(
  notesScope: EntityNotesScope,
  entityId: string,
  filesScope?: EntityFilesScope | null,
) {
  const id = entityId.trim()
  if (!id) return
  void removeEntityNotes(notesScope, id)
  if (filesScope) removeEntityFilesLocal(filesScope, id)
}
