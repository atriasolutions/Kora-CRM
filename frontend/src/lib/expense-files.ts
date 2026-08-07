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

export type ExpenseFile = EntityFileRecord

export const EXPENSE_FILES_MAX_COUNT = 30
export const EXPENSE_FILES_MAX_BYTES = 10 * 1024 * 1024

export const formatExpenseFileUploadedAt = formatFileUploadedAt

export {
  formatFileSize,
  fileIconKind,
  fileIconKind as expenseFileIconKind,
  canPreviewEntityFile as canPreviewExpenseFile,
  getEntityFilePreviewUrl as getExpenseFilePreviewUrl,
  isDemoEntityFilePreview as isDemoExpenseFilePreview,
  isPdfEntityFile as isPdfExpenseFile,
}

export function persistExpenseFiles(
  expenseId: string,
  expenseLabel: string,
  files: ExpenseFile[],
) {
  return persistEntityFiles('gasto', expenseId, expenseLabel, files)
}

export function getExpenseFiles(_expenseId: string, _uploadedBy: string): ExpenseFile[] {
  return []
}

export async function expenseFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<ExpenseFile> {
  return entityFileFromUpload(file, uploadedBy, 'gas-file')
}

export function validateExpenseFilesForUpload(
  current: ExpenseFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
