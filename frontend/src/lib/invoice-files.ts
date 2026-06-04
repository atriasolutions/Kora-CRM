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

export type InvoiceFile = EntityFileRecord

export const INVOICE_FILES_MAX_COUNT = 30
export const INVOICE_FILES_MAX_BYTES = 10 * 1024 * 1024

export const formatInvoiceFileUploadedAt = formatFileUploadedAt

export {
  formatFileSize,
  fileIconKind,
  fileIconKind as invoiceFileIconKind,
  canPreviewEntityFile as canPreviewInvoiceFile,
  getEntityFilePreviewUrl as getInvoiceFilePreviewUrl,
  isDemoEntityFilePreview as isDemoInvoiceFilePreview,
  isPdfEntityFile as isPdfInvoiceFile,
}

export function persistInvoiceFiles(
  invoiceId: string,
  invoiceLabel: string,
  files: InvoiceFile[],
) {
  return persistEntityFiles('factura', invoiceId, invoiceLabel, files)
}

export function getSeedInvoiceFiles(
  invoiceId: string,
  uploadedBy: string,
): InvoiceFile[] {
  if (invoiceId === 'inv1' || invoiceId.startsWith('facturacion-0')) {
    return [
      {
        id: `seed-${invoiceId}-1`,
        name: 'DTE_FAC-2024-0842.pdf',
        size: 245_000,
        mimeType: 'application/pdf',
        uploadedAt: '1 may 2024, 11:00',
        uploadedBy,
      },
    ]
  }
  return []
}

export function getInvoiceFiles(invoiceId: string, uploadedBy: string): InvoiceFile[] {
  return getSeedInvoiceFiles(invoiceId, uploadedBy)
}

export async function invoiceFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<InvoiceFile> {
  return entityFileFromUpload(file, uploadedBy, 'inv-file')
}

export function validateInvoiceFilesForUpload(
  current: InvoiceFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
