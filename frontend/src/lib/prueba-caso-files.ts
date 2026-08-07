import type { EntityFileRecord } from '@/lib/entity-files'
import {
  entityFileFromUpload,
  validateEntityFilesForUpload,
} from '@/lib/entity-files'
import { persistEntityFiles } from '@/lib/entity-files-storage'

export type PruebaCasoFile = EntityFileRecord

export function persistPruebaCasoFiles(
  casoId: string,
  casoLabel: string,
  files: PruebaCasoFile[],
) {
  return persistEntityFiles('prueba_caso', casoId, casoLabel, files)
}

export async function pruebaCasoFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<PruebaCasoFile> {
  return entityFileFromUpload(file, uploadedBy, 'pc-file')
}

export function validatePruebaCasoFilesForUpload(
  current: PruebaCasoFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
