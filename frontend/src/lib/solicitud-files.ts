import type { EntityFileRecord } from '@/lib/entity-files'
import {
  canPreviewEntityFile,
  entityFileFromUpload,
  fileIconKind,
  formatFileSize,
  formatFileUploadedAt,
  getEntityFilePreviewUrl,
  isDemoEntityFilePreview,
  isImageEntityFile,
  isPdfEntityFile,
  validateEntityFilesForUpload,
} from '@/lib/entity-files'
import { persistEntityFiles } from '@/lib/entity-files-storage'

export type SolicitudFile = EntityFileRecord

export const SOLICITUD_FILES_MAX_COUNT = 30
export const SOLICITUD_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewSolicitudFile,
  getEntityFilePreviewUrl as getSolicitudFilePreviewUrl,
  isDemoEntityFilePreview as isDemoSolicitudFilePreview,
  isPdfEntityFile as isPdfSolicitudFile,
  isImageEntityFile,
}

export function persistSolicitudFiles(
  solicitudId: string,
  solicitudLabel: string,
  files: SolicitudFile[],
) {
  return persistEntityFiles('solicitud', solicitudId, solicitudLabel, files)
}

export function getSeedSolicitudFiles(_solicitudId: string, _uploadedBy: string): SolicitudFile[] {
  return []
}

export function getSolicitudFiles(solicitudId: string, uploadedBy: string): SolicitudFile[] {
  return getSeedSolicitudFiles(solicitudId, uploadedBy)
}

export async function solicitudFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<SolicitudFile> {
  return entityFileFromUpload(file, uploadedBy, 's-file')
}

export function validateSolicitudFilesForUpload(
  current: SolicitudFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
