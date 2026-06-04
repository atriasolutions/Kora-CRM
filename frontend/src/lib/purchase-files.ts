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

export type PurchaseFile = EntityFileRecord

export const PURCHASE_FILES_MAX_COUNT = 30
export const PURCHASE_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewPurchaseFile,
  getEntityFilePreviewUrl as getPurchaseFilePreviewUrl,
  isDemoEntityFilePreview as isDemoPurchaseFilePreview,
  isPdfEntityFile as isPdfPurchaseFile,
}

export function persistPurchaseFiles(
  purchaseId: string,
  purchaseLabel: string,
  files: PurchaseFile[],
) {
  return persistEntityFiles('compra', purchaseId, purchaseLabel, files)
}

export function getSeedPurchaseFiles(
  purchaseId: string,
  uploadedBy: string,
): PurchaseFile[] {
  const idxMatch =
    /^compras-(\d+)$/.exec(purchaseId) ?? /^pur(\d+)$/.exec(purchaseId)
  const idx = idxMatch ? Number.parseInt(idxMatch[1] ?? '0', 10) : 0

  if (purchaseId === 'pur1' || idx % 3 === 0) {
    return [
      {
        id: `seed-${purchaseId}-1`,
        name: 'Orden_compra_firmada.pdf',
        size: 1_890_000,
        mimeType: 'application/pdf',
        uploadedAt: '8 may 2024, 14:20',
        uploadedBy,
      },
    ]
  }

  if (idx % 3 === 1) {
    return [
      {
        id: `seed-${purchaseId}-1`,
        name: 'Guia_despacho_proveedor.pdf',
        size: 420_000,
        mimeType: 'application/pdf',
        uploadedAt: '22 abr 2024, 11:05',
        uploadedBy: 'Carlos Vega',
      },
      {
        id: `seed-${purchaseId}-2`,
        name: 'Logo_alta_resolucion.png',
        size: 256_000,
        mimeType: 'image/png',
        uploadedAt: '15 abr 2024, 09:30',
        uploadedBy,
      },
    ]
  }

  return []
}

export function getPurchaseFiles(
  purchaseId: string,
  uploadedBy: string,
): PurchaseFile[] {
  return getSeedPurchaseFiles(purchaseId, uploadedBy)
}

export async function purchaseFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<PurchaseFile> {
  return entityFileFromUpload(file, uploadedBy, 'file')
}

export function validatePurchaseFilesForUpload(
  current: PurchaseFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
