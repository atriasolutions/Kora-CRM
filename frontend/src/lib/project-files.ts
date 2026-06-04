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

export type ProjectFile = EntityFileRecord

export const PROJECT_FILES_MAX_COUNT = 30
export const PROJECT_FILES_MAX_BYTES = 10 * 1024 * 1024

export {
  formatFileSize,
  formatFileUploadedAt,
  fileIconKind,
  canPreviewEntityFile as canPreviewProjectFile,
  getEntityFilePreviewUrl as getProjectFilePreviewUrl,
  isDemoEntityFilePreview as isDemoProjectFilePreview,
  isPdfEntityFile as isPdfProjectFile,
}

export function persistProjectFiles(
  projectId: string,
  projectLabel: string,
  files: ProjectFile[],
) {
  return persistEntityFiles('proyecto', projectId, projectLabel, files)
}

export function getSeedProjectFiles(_projectId: string, _uploadedBy: string): ProjectFile[] {
  return []
}

export function getProjectFiles(projectId: string, uploadedBy: string): ProjectFile[] {
  return getSeedProjectFiles(projectId, uploadedBy)
}

export async function projectFileFromUpload(
  file: File,
  uploadedBy: string,
): Promise<ProjectFile> {
  return entityFileFromUpload(file, uploadedBy, 'p-file')
}

export function validateProjectFilesForUpload(
  current: ProjectFile[],
  incoming: File[],
): string | null {
  return validateEntityFilesForUpload(current, incoming)
}
