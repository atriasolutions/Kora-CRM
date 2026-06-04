const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const GENERATED_IMAGE_URL =
  /^https:\/\/(?:api\.dicebear\.com\/|images\.unsplash\.com\/)/

/** Ignora avatares/logos generados automáticamente (Dicebear, Unsplash). */
export function resolveEntityImageSrc(url: string | undefined | null): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed || GENERATED_IMAGE_URL.test(trimmed)) return undefined
  return trimmed
}

export function defaultProductImageUrl(name: string): string {
  return `https://api.dicebear.com/7.x/icons/svg?seed=${encodeURIComponent(name.trim() || 'producto')}`
}

function assertImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no válido. Usa JPG, PNG, WebP o GIF.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen no puede superar 2 MB.')
  }
}

/** Recorte centrado cuadrado + redimensionado para avatares y logos en ficha. */
export async function cropImageFileToSquareDataUrl(
  file: File,
  outputSize = 512,
): Promise<string> {
  assertImageFile(file)

  const bitmap = await createImageBitmap(file)
  try {
    const cropSize = Math.min(bitmap.width, bitmap.height)
    const sx = Math.floor((bitmap.width - cropSize) / 2)
    const sy = Math.floor((bitmap.height - cropSize) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo procesar la imagen.')

    const usePng = file.type === 'image/png' || file.type === 'image/gif'
    if (!usePng) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, outputSize, outputSize)
    }

    ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize)

    const mime = usePng ? 'image/png' : 'image/jpeg'
    const quality = usePng ? undefined : 0.9
    return canvas.toDataURL(mime, quality)
  } finally {
    bitmap.close()
  }
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      assertImageFile(file)
    } catch (err) {
      reject(err)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('No se pudo leer la imagen.'))
    }
    reader.onerror = () => reject(new Error('Error al cargar la imagen.'))
    reader.readAsDataURL(file)
  })
}

const AVATAR_OUTPUT_SIZE = 192

/** Avatar / foto de perfil: recorte cuadrado, tamaño moderado para persistir en API sin saturar el servidor. */
export function readAvatarImageFileAsDataUrl(file: File): Promise<string> {
  return cropImageFileToSquareDataUrl(file, AVATAR_OUTPUT_SIZE).then((dataUrl) => {
    if (dataUrl.length > 350_000) {
      throw new Error(
        'La imagen procesada es demasiado grande. Prueba con otra foto o un archivo más pequeño.',
      )
    }
    return dataUrl
  })
}

export function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}
