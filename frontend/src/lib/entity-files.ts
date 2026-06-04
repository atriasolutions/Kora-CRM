export type EntityFileRecord = {
  id: string
  name: string
  size: number
  mimeType?: string
  uploadedAt: string
  uploadedBy: string
  dataUrl?: string
}

export const ENTITY_FILES_MAX_COUNT = 30
export const ENTITY_FILES_MAX_BYTES = 10 * 1024 * 1024

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatFileUploadedAt(date = new Date()): string {
  return date.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function createEntityFileId(prefix = 'file') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function entityFileFromUpload(
  file: File,
  uploadedBy: string,
  idPrefix = 'file',
): Promise<EntityFileRecord> {
  const dataUrl = await readFileAsDataUrl(file)
  return {
    id: createEntityFileId(idPrefix),
    name: file.name,
    size: file.size,
    mimeType: file.type || undefined,
    uploadedAt: formatFileUploadedAt(),
    uploadedBy,
    dataUrl,
  }
}

export function validateEntityFilesForUpload(
  current: EntityFileRecord[],
  incoming: File[],
): string | null {
  if (current.length + incoming.length > ENTITY_FILES_MAX_COUNT) {
    return `Máximo ${ENTITY_FILES_MAX_COUNT} archivos por registro.`
  }
  for (const file of incoming) {
    if (file.size > ENTITY_FILES_MAX_BYTES) {
      return `«${file.name}» supera el límite de 10 MB.`
    }
  }
  return null
}

const DEMO_PDF_PREVIEW_DATA_URL =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2pvCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKERlbW8pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjA2IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNSAvUm9vdCAxIDAgUiA+CnN0YXJ0eHJlZgoyOTAKJSVFT0YK'

export function fileIconKind(
  mimeType?: string,
  name?: string,
): 'pdf' | 'image' | 'sheet' | 'doc' | 'other' {
  const mime = (mimeType ?? '').toLowerCase()
  const ext = name?.split('.').pop()?.toLowerCase() ?? ''
  if (mime.includes('pdf') || ext === 'pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    ext === 'xlsx' ||
    ext === 'xls' ||
    ext === 'csv'
  ) {
    return 'sheet'
  }
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    ext === 'docx' ||
    ext === 'doc'
  ) {
    return 'doc'
  }
  return 'other'
}

export function isPdfEntityFile(file: EntityFileRecord): boolean {
  return fileIconKind(file.mimeType, file.name) === 'pdf'
}

export function getEntityFilePreviewUrl(file: EntityFileRecord): string | null {
  if (!isPdfEntityFile(file)) return null
  if (file.dataUrl) return file.dataUrl
  if (file.id.startsWith('seed-')) return DEMO_PDF_PREVIEW_DATA_URL
  return null
}

export function canPreviewEntityFile(file: EntityFileRecord): boolean {
  return getEntityFilePreviewUrl(file) !== null
}

export function isDemoEntityFilePreview(file: EntityFileRecord): boolean {
  return isPdfEntityFile(file) && !file.dataUrl && file.id.startsWith('seed-')
}
