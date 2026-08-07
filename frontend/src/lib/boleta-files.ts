import type { EntityFileRecord } from '@/lib/entity-files'
import {
  canPreviewEntityFile,
  entityFileFromUpload,
  fileIconKind,
  formatFileSize,
  formatFileUploadedAt,
  getEntityFilePreviewUrl,
  isDemoEntityFilePreview,
  isPdfEntityFile,
  validateEntityFilesForUpload,
} from '@/lib/entity-files'
import { persistEntityFiles } from '@/lib/entity-files-storage'

export type BoletaFile = EntityFileRecord

export const BOLETA_FILES_MAX_COUNT = 30
export const BOLETA_FILES_MAX_BYTES = 10 * 1024 * 1024

export const formatBoletaFileUploadedAt = formatFileUploadedAt

export {
  formatFileSize,
  fileIconKind,
  fileIconKind as boletaFileIconKind,
  canPreviewEntityFile as canPreviewBoletaFile,
  getEntityFilePreviewUrl as getBoletaFilePreviewUrl,
  isDemoEntityFilePreview as isDemoBoletaFilePreview,
  isPdfEntityFile as isPdfBoletaFile,
}

export function persistBoletaFiles(
  boletaId: string,
  boletaLabel: string,
  files: BoletaFile[],
) {
  return persistEntityFiles('boleta', boletaId, boletaLabel, files)
}

export function getSeedBoletaFiles(boletaId: string, uploadedBy: string): BoletaFile[] {
  if (boletaId === 'bol1' || boletaId.startsWith('boletas-0')) {
    return [
      {
        id: `seed-${boletaId}-1`,
        name: 'BOL-2024-1201.pdf',
        size: 128_000,
        mimeType: 'application/pdf',
        uploadedAt: '3 may 2024, 10:30',
        uploadedBy,
      },
    ]
  }
  return []
}

export function getBoletaFiles(boletaId: string, uploadedBy: string): BoletaFile[] {
  return getSeedBoletaFiles(boletaId, uploadedBy)
}

export async function boletaFileFromUpload(file: File, uploadedBy: string): Promise<BoletaFile> {
  return entityFileFromUpload(file, uploadedBy, 'bol-file')
}

export function validateBoletaFilesForUpload(
  current: BoletaFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
