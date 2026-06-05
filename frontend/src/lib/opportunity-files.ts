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

export type OpportunityFile = EntityFileRecord

export const OPPORTUNITY_FILES_MAX_COUNT = 30
export const OPPORTUNITY_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewOpportunityFile,
  getEntityFilePreviewUrl as getOpportunityFilePreviewUrl,
  isDemoEntityFilePreview as isDemoOpportunityFilePreview,
  isPdfEntityFile as isPdfOpportunityFile,
}

export function persistOpportunityFiles(
  opportunityId: string,
  opportunityLabel: string,
  files: OpportunityFile[],
) {
  return persistEntityFiles('oportunidad', opportunityId, opportunityLabel, files)
}

export function getSeedOpportunityFiles(
  _opportunityId: string,
  _uploadedBy: string,
): OpportunityFile[] {
  return []
}

export function getOpportunityFiles(
  opportunityId: string,
  uploadedBy: string,
): OpportunityFile[] {
  return getSeedOpportunityFiles(opportunityId, uploadedBy)
}

export async function opportunityFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<OpportunityFile> {
  return entityFileFromUpload(file, uploadedBy, 'opp-file')
}

export function validateOpportunityFilesForUpload(
  current: OpportunityFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
