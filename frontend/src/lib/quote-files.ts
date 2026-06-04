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

export type QuoteFile = EntityFileRecord

export const QUOTE_FILES_MAX_COUNT = 30
export const QUOTE_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewQuoteFile,
  getEntityFilePreviewUrl as getQuoteFilePreviewUrl,
  isDemoEntityFilePreview as isDemoQuoteFilePreview,
  isPdfEntityFile as isPdfQuoteFile,
}

export function persistQuoteFiles(
  quoteId: string,
  quoteLabel: string,
  files: QuoteFile[],
) {
  return persistEntityFiles('cotizacion', quoteId, quoteLabel, files)
}

export function getSeedQuoteFiles(_quoteId: string, _uploadedBy: string): QuoteFile[] {
  return []
}

export function getQuoteFiles(quoteId: string, uploadedBy: string): QuoteFile[] {
  return getSeedQuoteFiles(quoteId, uploadedBy)
}

export async function quoteFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<QuoteFile> {
  return entityFileFromUpload(file, uploadedBy, 'q-file')
}

export function validateQuoteFilesForUpload(
  current: QuoteFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
