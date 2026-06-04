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
import { persistEntityFiles, removeEntityFilesLocal } from '@/lib/entity-files-storage'

export type CompanyFile = EntityFileRecord

export const COMPANY_FILES_MAX_COUNT = 30
export const COMPANY_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewCompanyFile,
  getEntityFilePreviewUrl as getCompanyFilePreviewUrl,
  isDemoEntityFilePreview as isDemoCompanyFilePreview,
  isPdfEntityFile as isPdfCompanyFile,
}

export function persistCompanyFiles(
  companyId: string,
  companyName: string,
  files: CompanyFile[],
) {
  return persistEntityFiles('empresa', companyId, companyName, files)
}

export function removeStoredCompanyFiles(companyId: string) {
  removeEntityFilesLocal('empresa', companyId)
}

export function getSeedCompanyFiles(
  companyId: string,
  uploadedBy: string,
): CompanyFile[] {
  const idxMatch =
    /^empresas-(\d+)$/.exec(companyId) ?? /^co(\d+)$/.exec(companyId)
  const idx = idxMatch ? Number.parseInt(idxMatch[1] ?? '0', 10) : 0

  if (companyId === 'co1' || idx % 3 === 0) {
    return [
      {
        id: `seed-${companyId}-1`,
        name: 'Contrato_marco_empresa.pdf',
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
        id: `seed-${companyId}-1`,
        name: 'Certificado_antecedentes.pdf',
        size: 420_000,
        mimeType: 'application/pdf',
        uploadedAt: '22 abr 2024, 11:05',
        uploadedBy: 'Carlos Vega',
      },
      {
        id: `seed-${companyId}-2`,
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

export function getCompanyFiles(
  companyId: string,
  uploadedBy: string,
): CompanyFile[] {
  return getSeedCompanyFiles(companyId, uploadedBy)
}

export async function companyFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<CompanyFile> {
  return entityFileFromUpload(file, uploadedBy, 'file')
}

export function validateCompanyFilesForUpload(
  current: CompanyFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
