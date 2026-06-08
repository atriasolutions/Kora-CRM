/** URLs de avatar/logo generadas (Unsplash, Dicebear) — no son fotos reales del usuario. */
const GENERATED_IMAGE_URL =
  /^https:\/\/(?:api\.dicebear\.com\/|images\.unsplash\.com\/)/

export function isGeneratedImageUrl(url: string): boolean {
  return GENERATED_IMAGE_URL.test(url.trim())
}

/** En listados no enviamos data URLs (base64): pesan mucho y pueden tumbar el servidor o el proxy. */
export function imageUrlForList(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('data:')) return undefined
  if (trimmed.length > 2048) return undefined
  if (isGeneratedImageUrl(trimmed)) return undefined
  return trimmed
}

/** URL liviana para listados cuando la imagen está en BD (data URL → endpoint autenticado). */
export function entityImageUrlForList(
  apiPath: string,
  stored: string | null | undefined,
): string {
  const trimmed = stored?.trim()
  if (!trimmed || isGeneratedImageUrl(trimmed)) return ''
  const direct = imageUrlForList(trimmed)
  if (direct) return direct
  return apiPath
}

const MAX_DETAIL_DATA_URL_LENGTH = 4_000_000

/** En ficha sí devolvemos data URLs subidas por el usuario (avatares/logos). */
export function imageUrlForDetail(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('data:')) {
    if (trimmed.length > MAX_DETAIL_DATA_URL_LENGTH) return undefined
    return trimmed
  }
  return imageUrlForList(trimmed)
}
