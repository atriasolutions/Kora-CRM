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

export type InventoryFile = EntityFileRecord

export const INVENTORY_FILES_MAX_COUNT = 30
export const INVENTORY_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewInventoryFile,
  getEntityFilePreviewUrl as getInventoryFilePreviewUrl,
  isDemoEntityFilePreview as isDemoInventoryFilePreview,
  isPdfEntityFile as isPdfInventoryFile,
}

export function persistInventoryFiles(
  inventoryId: string,
  inventoryLabel: string,
  files: InventoryFile[],
) {
  return persistEntityFiles('inventario', inventoryId, inventoryLabel, files)
}

export function getSeedInventoryFiles(
  inventoryId: string,
  uploadedBy: string,
): InventoryFile[] {
  const idxMatch =
    /^inventario-(\d+)$/.exec(inventoryId) ?? /^inv(\d+)$/.exec(inventoryId)
  const idx = idxMatch ? Number.parseInt(idxMatch[1] ?? '0', 10) : 0

  if (inventoryId === 'inv1' || idx % 3 === 0) {
    return [
      {
        id: `seed-${inventoryId}-1`,
        name: 'Hoja_conteo_inventario.pdf',
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
        id: `seed-${inventoryId}-1`,
        name: 'Guia_despacho_producto.pdf',
        size: 420_000,
        mimeType: 'application/pdf',
        uploadedAt: '22 abr 2024, 11:05',
        uploadedBy: 'Carlos Vega',
      },
      {
        id: `seed-${inventoryId}-2`,
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

export function getInventoryFiles(
  inventoryId: string,
  uploadedBy: string,
): InventoryFile[] {
  return getSeedInventoryFiles(inventoryId, uploadedBy)
}

export async function inventoryFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<InventoryFile> {
  return entityFileFromUpload(file, uploadedBy, 'file')
}

export function validateInventoryFilesForUpload(
  current: InventoryFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
