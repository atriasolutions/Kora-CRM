import type { UserListItem } from '@/data/users.mock'
import type { GanttRow } from '@/lib/project-gantt'
import { initialsFromLabel } from '@/lib/image-upload'
import { resolveUserAvatarByName } from '@/lib/user-avatar-resolve'

const AVATAR_R = 10
const AVATAR_DIAM = AVATAR_R * 2
const AVATAR_OVERLAP = 7

export type GanttExportAvatarMap = Map<string, string | undefined>

async function imageUrlToDataUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (response.ok) {
      const blob = await response.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(blob)
      })
    }
  } catch {
    /* fetch falló; intentar vía canvas */
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || AVATAR_DIAM
      canvas.height = img.naturalHeight || AVATAR_DIAM
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(undefined)
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(undefined)
    img.src = url
  })
}

export async function buildGanttExportAvatarMap(
  assigneeNames: Iterable<string>,
  users: UserListItem[],
): Promise<GanttExportAvatarMap> {
  const unique = [...new Set([...assigneeNames].map((n) => n.trim()).filter(Boolean))]
  const map: GanttExportAvatarMap = new Map()

  await Promise.all(
    unique.map(async (name) => {
      const url = await resolveUserAvatarByName(name, users)
      const dataUrl = url ? await imageUrlToDataUrl(url) : undefined
      map.set(name, dataUrl)
    }),
  )

  return map
}

function svgAvatarCircle(
  cx: number,
  cy: number,
  clipId: string,
  dataUrl: string | undefined,
  name: string,
  escapeXml: (text: string) => string,
): string {
  const parts: string[] = [
    `<defs><clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${AVATAR_R}"/></clipPath></defs>`,
    `<circle cx="${cx}" cy="${cy}" r="${AVATAR_R}" fill="#e2e8f0" stroke="#ffffff" stroke-width="2"/>`,
  ]

  if (dataUrl) {
    const safeHref = dataUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    parts.push(
      `<image href="${safeHref}" x="${cx - AVATAR_R}" y="${cy - AVATAR_R}" width="${AVATAR_DIAM}" height="${AVATAR_DIAM}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`,
    )
  } else {
    parts.push(
      `<text x="${cx}" y="${cy + 3.5}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="600" fill="#475569">${escapeXml(initialsFromLabel(name))}</text>`,
    )
  }

  return parts.join('')
}

/** Ancho reservado a la izquierda del nombre para la pila de avatares. */
export function ganttExportAssigneeStackWidth(assignees: string[]): number {
  const count = assignees.map((s) => s.trim()).filter(Boolean).length
  if (count === 0) return 0
  if (count === 1) return AVATAR_DIAM + 4
  return AVATAR_DIAM + (count - 1) * (AVATAR_DIAM - AVATAR_OVERLAP) + 4
}

export function computeGanttExportLabelWidth(rows: GanttRow[]): number {
  let max = 280
  for (const row of rows) {
    if (row.kind !== 'item') continue
    const assignees = row.item.assignees.map((s) => s.trim()).filter(Boolean)
    const stackW = ganttExportAssigneeStackWidth(assignees)
    const indent = row.depth === 1 ? 20 : 12
    const nameEstimate = Math.min(row.item.name.length * 6.2, 220)
    max = Math.max(max, indent + stackW + nameEstimate + 12)
  }
  return Math.ceil(Math.min(max, 560))
}

export function renderGanttAssigneeStackSvg(
  assignees: string[],
  originX: number,
  centerY: number,
  avatarMap: GanttExportAvatarMap,
  idPrefix: string,
  escapeXml: (text: string) => string,
): string {
  const list = assignees.map((s) => s.trim()).filter(Boolean)
  if (list.length === 0) {
    return `<circle cx="${originX + AVATAR_R}" cy="${centerY}" r="${AVATAR_R}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 2"/>`
  }

  const parts: string[] = []

  list.forEach((name, index) => {
    const cx = originX + AVATAR_R + index * (AVATAR_DIAM - AVATAR_OVERLAP)
    parts.push(
      svgAvatarCircle(
        cx,
        centerY,
        `${idPrefix}-a${index}`,
        avatarMap.get(name),
        name,
        escapeXml,
      ),
    )
  })

  return parts.join('')
}
