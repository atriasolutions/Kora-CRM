import { extractFileIdsFromDescription, plainTextFromDescription } from '@/lib/solicitud-description-media'

export function displayPruebaCaseNumber(code: string): string {
  const match = /-CP-(\d+)$/.exec(code)
  return match ? `CP-${match[1]}` : code
}

export function casoHasEvidence(html: string | null | undefined): boolean {
  const value = html?.trim() ?? ''
  if (!value) return false
  if (extractFileIdsFromDescription(value).length > 0) return true
  return Boolean(plainTextFromDescription(value).trim())
}

export function casoEvidencePreview(html: string | null | undefined, max = 120): string {
  const value = html?.trim() ?? ''
  const text = plainTextFromDescription(value).trim()
  if (text) {
    if (text.length <= max) return text
    return `${text.slice(0, max).trim()}…`
  }
  if (extractFileIdsFromDescription(value).length > 0) return 'Con imágenes'
  return ''
}

export function okStatusLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Sí'
  if (value === false) return 'No'
  return 'Pendiente'
}
