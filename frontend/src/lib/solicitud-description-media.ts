import type { SolicitudFile } from '@/lib/solicitud-files'

export const SOLICITUD_INLINE_IMAGE_CLASS = 'solicitud-inline-image'
export const SOLICITUD_INLINE_IMAGE_CLICKABLE_CLASS = 'solicitud-inline-image-clickable'
export const SOLICITUD_FILE_ID_ATTR = 'data-file-id'

const FILE_ID_PATTERN = /data-file-id="([^"]+)"/g

export function extractFileIdsFromDescription(html: string): string[] {
  const ids = new Set<string>()
  for (const match of html.matchAll(FILE_ID_PATTERN)) {
    const id = match[1]?.trim()
    if (id) ids.add(id)
  }
  return Array.from(ids)
}

/** Empareja archivos antes/después del sync (p. ej. ids temporales → UUID del servidor). */
export function buildDescriptionFileIdMap(
  before: SolicitudFile[],
  after: SolicitudFile[],
): Map<string, string> {
  const map = new Map<string, string>()
  const usedAfter = new Set<string>()

  for (const oldFile of before) {
    if (!oldFile.id) continue

    const match =
      after.find((file) => file.id === oldFile.id && !usedAfter.has(file.id)) ??
      after.find(
        (file) =>
          !usedAfter.has(file.id) &&
          file.name === oldFile.name &&
          file.size === oldFile.size,
      ) ??
      after.find((file) => !usedAfter.has(file.id) && file.name === oldFile.name)

    if (match) {
      usedAfter.add(match.id)
      if (match.id !== oldFile.id) {
        map.set(oldFile.id, match.id)
      }
    }
  }

  return map
}

export function remapDescriptionFileIds(
  html: string,
  idMap: Map<string, string>,
): string {
  if (!html.trim() || idMap.size === 0) return html

  let result = html
  for (const [oldId, newId] of idMap) {
    result = result.replaceAll(
      `${SOLICITUD_FILE_ID_ATTR}="${oldId}"`,
      `${SOLICITUD_FILE_ID_ATTR}="${newId}"`,
    )
  }
  return result
}

export async function persistSolicitudDescriptionMedia(
  solicitudId: string,
  solicitudLabel: string,
  descriptionHtml: string,
  files: SolicitudFile[],
  persistFiles: (
    id: string,
    label: string,
    files: SolicitudFile[],
  ) => Promise<SolicitudFile[]>,
): Promise<{ description: string; files: SolicitudFile[] }> {
  const serialized = serializeDescriptionHtml(descriptionHtml)
  const savedFiles = await persistFiles(solicitudId, solicitudLabel, files)
  const idMap = buildDescriptionFileIdMap(files, savedFiles)
  const description = remapDescriptionFileIds(serialized, idMap)
  return { description, files: savedFiles }
}

/** Quita data URLs del HTML persistido; las imágenes se resuelven desde Archivos. */
export function serializeDescriptionHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ''

  if (typeof DOMParser === 'undefined') {
    return trimmed.replace(/src="data:[^"]*"/g, 'src=""')
  }

  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  doc.querySelectorAll('img').forEach((img) => {
    const fileId = img.getAttribute(SOLICITUD_FILE_ID_ATTR)
    if (fileId) {
      img.removeAttribute('src')
    } else if (img.getAttribute('src')?.startsWith('data:')) {
      img.remove()
    }
  })
  return doc.body.innerHTML
}

export function hydrateDescriptionHtml(
  html: string,
  files: SolicitudFile[],
): string {
  const trimmed = html.trim()
  if (!trimmed) return ''

  if (typeof DOMParser === 'undefined') return trimmed

  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  const byId = new Map(files.map((f) => [f.id, f]))
  const byName = new Map<string, SolicitudFile[]>()
  for (const file of files) {
    const list = byName.get(file.name) ?? []
    list.push(file)
    byName.set(file.name, list)
  }

  doc.querySelectorAll('img').forEach((img) => {
    const fileId = img.getAttribute(SOLICITUD_FILE_ID_ATTR)
    if (!fileId) return

    let file = byId.get(fileId)
    if (!file) {
      const alt = img.getAttribute('alt')?.trim()
      if (alt) {
        const candidates = byName.get(alt)
        file = candidates?.[0]
      }
    }

    if (file?.dataUrl) {
      img.setAttribute('src', file.dataUrl)
      if (!img.getAttribute('alt') && file.name) {
        img.setAttribute('alt', file.name)
      }
      if (file.id !== fileId) {
        img.setAttribute(SOLICITUD_FILE_ID_ATTR, file.id)
      }
      img.classList.add(SOLICITUD_INLINE_IMAGE_CLICKABLE_CLASS)
      img.setAttribute('role', 'button')
      img.setAttribute('tabindex', '0')
    }
    img.classList.add(SOLICITUD_INLINE_IMAGE_CLASS)
  })

  return doc.body.innerHTML
}

export function resolveDescriptionImageFile(
  fileId: string | null,
  alt: string | null | undefined,
  files: SolicitudFile[],
): SolicitudFile | undefined {
  if (fileId) {
    const byId = files.find((file) => file.id === fileId)
    if (byId) return byId
  }
  const name = alt?.trim()
  if (name) return files.find((file) => file.name === name)
  return undefined
}

export function isDescriptionHtml(html: string): boolean {
  return /<[a-z][\s\S]*>/i.test(html.trim())
}

export function plainTextFromDescription(html: string): string {
  if (!html.trim()) return ''
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, ' ').trim()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').trim()
}

/** Añade archivos nuevos referenciados en la descripción sin duplicar. */
export function mergeDescriptionFiles(
  current: SolicitudFile[],
  additions: SolicitudFile[],
): SolicitudFile[] {
  if (additions.length === 0) return current
  const ids = new Set(current.map((f) => f.id))
  const next = [...current]
  for (const file of additions) {
    if (!ids.has(file.id)) {
      ids.add(file.id)
      next.unshift(file)
    }
  }
  return next
}
