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

export type ContactFile = EntityFileRecord

export const CONTACT_FILES_MAX_COUNT = 30
export const CONTACT_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewContactFile,
  getEntityFilePreviewUrl as getContactFilePreviewUrl,
  isDemoEntityFilePreview as isDemoContactFilePreview,
  isPdfEntityFile as isPdfContactFile,
}

export function persistContactFiles(
  contactId: string,
  contactName: string,
  files: ContactFile[],
) {
  return persistEntityFiles('contacto', contactId, contactName, files)
}

export function removeStoredContactFiles(_contactId: string) {
  /* API / localStorage vía entity-files-storage */
}

export function getSeedContactFiles(
  contactId: string,
  uploadedBy: string,
): ContactFile[] {
  const idxMatch =
    /^contactos-(\d+)$/.exec(contactId) ?? /^contact-(\d+)$/.exec(contactId)
  const idx = idxMatch ? Number.parseInt(idxMatch[1] ?? '0', 10) : 0

  if (contactId === 'c1' || idx % 3 === 0) {
    return [
      {
        id: `seed-${contactId}-1`,
        name: 'Propuesta_comercial_2024.pdf',
        size: 2_458_000,
        mimeType: 'application/pdf',
        uploadedAt: '12 may 2024, 10:15',
        uploadedBy,
      },
      {
        id: `seed-${contactId}-2`,
        name: 'NDA_firmado.pdf',
        size: 312_400,
        mimeType: 'application/pdf',
        uploadedAt: '3 abr 2024, 16:40',
        uploadedBy: 'Carlos Vega',
      },
    ]
  }

  if (idx % 3 === 1) {
    return [
      {
        id: `seed-${contactId}-1`,
        name: 'Presentacion_producto.pptx',
        size: 4_120_000,
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        uploadedAt: '20 may 2024, 09:00',
        uploadedBy,
      },
    ]
  }

  return []
}

export function getContactFiles(
  contactId: string,
  uploadedBy: string,
): ContactFile[] {
  return getSeedContactFiles(contactId, uploadedBy)
}

export async function contactFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<ContactFile> {
  return entityFileFromUpload(file, uploadedBy, 'file')
}

export function validateFilesForUpload(
  current: ContactFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
