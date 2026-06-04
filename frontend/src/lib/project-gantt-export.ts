import * as XLSX from 'xlsx'

import {
  buildGanttRows,
  buildGanttTimeline,
  ganttTimelineWidthPx,
  rangeToBarStyle,
  todayMarkerPct,
  type GanttRow,
  type GanttTimeline,
} from '@/lib/project-gantt'
import { formatDisplayDate } from '@/lib/project-work-plan'
import { workItemStatusLabel } from '@/lib/project-work-status'
import type { ProjectWorkPlan } from '@/types/project-work-plan'

const LABEL_WIDTH = 280
const HEADER_HEIGHT = 40
const GROUP_ROW_HEIGHT = 36
const ITEM_ROW_HEIGHT = 44

const GROUP_ACCENT: Record<string, { fill: string; stroke: string }> = {
  'chart-1': { fill: '#dbeafe', stroke: '#93c5fd' },
  'chart-2': { fill: '#dcfce7', stroke: '#86efac' },
  'chart-3': { fill: '#ffedd5', stroke: '#fdba74' },
  'chart-4': { fill: '#f3e8ff', stroke: '#d8b4fe' },
  'chart-5': { fill: '#fce7f3', stroke: '#f9a8d4' },
}

function sanitizeExportBaseName(name: string): string {
  const trimmed = name.replace(/[^\w\s-áéíóúñÁÉÍÓÚÑ]/gi, '').trim()
  return trimmed || 'proyecto'
}

function exportTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isoToExcelDate(iso: string): string {
  if (!iso?.trim()) return ''
  return formatDisplayDate(iso)
}

function buildExcelRows(plan: ProjectWorkPlan): string[][] {
  const rows = buildGanttRows(plan)
  const data: string[][] = []

  for (const row of rows) {
    if (row.kind === 'group') {
      data.push([row.label, '', '', '', '', '', '', '', '', ''])
      continue
    }
    const { item } = row
    const indent = row.depth === 1 ? '  ' : ''
    data.push([
      indent + item.name,
      item.assignees.map((s) => s.trim()).filter(Boolean).join('; ') || '—',
      workItemStatusLabel(item.status),
      isoToExcelDate(item.estimatedStart),
      isoToExcelDate(item.estimatedEnd),
      isoToExcelDate(item.actualStart),
      isoToExcelDate(item.actualEnd),
      String(item.estimatedHours || 0),
      String(item.actualHours || 0),
      row.done ? 'Sí' : 'No',
    ])
  }
  return data
}

export function downloadGanttExcel(plan: ProjectWorkPlan, projectTitle: string): boolean {
  const timeline = buildGanttTimeline(plan)
  if (!timeline) return false

  const headers = [
    'Actividad',
    'Responsables',
    'Estado',
    'Inicio planificado',
    'Fin planificado',
    'Inicio ejecutado',
    'Fin ejecutado',
    'Horas estimadas',
    'Horas reales',
    'Completada',
  ]
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...buildExcelRows(plan)])
  const meta = XLSX.utils.aoa_to_sheet([
    ['Proyecto', projectTitle],
    ['Exportado', new Date().toLocaleString('es-CL')],
    [
      'Rango Gantt',
      `${formatDisplayDate(toIsoDate(timeline.rangeStart))} — ${formatDisplayDate(toIsoDate(timeline.rangeEnd))}`,
    ],
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Gantt')
  XLSX.utils.book_append_sheet(workbook, meta, 'Info')
  const base = sanitizeExportBaseName(projectTitle)
  XLSX.writeFile(workbook, `${base}-gantt-${exportTimestamp()}.xlsx`)
  return true
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rowHeight(row: GanttRow): number {
  return row.kind === 'group' ? GROUP_ROW_HEIGHT : ITEM_ROW_HEIGHT
}

function renderGanttSvg(
  rows: GanttRow[],
  timeline: GanttTimeline,
  widthPx: number,
  projectTitle: string,
): string {
  const timelineWidth = widthPx
  const totalWidth = LABEL_WIDTH + timelineWidth
  const bodyHeight = rows.reduce((h, r) => h + rowHeight(r), 0)
  const totalHeight = HEADER_HEIGHT + bodyHeight
  const todayPct = todayMarkerPct(timeline)

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`,
  )
  parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`)
  parts.push(
    `<text x="12" y="22" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" fill="#0f172a">${escapeXml(projectTitle)} — Gantt</text>`,
  )

  parts.push(
    `<rect x="0" y="${HEADER_HEIGHT - 40}" width="${LABEL_WIDTH}" height="${HEADER_HEIGHT}" fill="#f1f5f9" stroke="#e2e8f0"/>`,
  )
  parts.push(
    `<text x="12" y="${HEADER_HEIGHT - 14}" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="600" fill="#64748b">ACTIVIDAD</text>`,
  )
  parts.push(
    `<rect x="${LABEL_WIDTH}" y="${HEADER_HEIGHT - 40}" width="${timelineWidth}" height="${HEADER_HEIGHT}" fill="#f1f5f9" stroke="#e2e8f0"/>`,
  )

  for (const tick of timeline.ticks) {
    const x = LABEL_WIDTH + (tick.leftPct / 100) * timelineWidth
    parts.push(
      `<line x1="${x}" y1="${HEADER_HEIGHT - 40}" x2="${x}" y2="${totalHeight}" stroke="#e2e8f0" stroke-width="1"/>`,
    )
    parts.push(
      `<text x="${x + 4}" y="${HEADER_HEIGHT - 12}" font-family="Inter, system-ui, sans-serif" font-size="10" fill="#64748b">${escapeXml(tick.label)}</text>`,
    )
  }

  if (todayPct != null) {
    const x = LABEL_WIDTH + (todayPct / 100) * timelineWidth
    parts.push(
      `<line x1="${x}" y1="${HEADER_HEIGHT - 40}" x2="${x}" y2="${totalHeight}" stroke="#ef4444" stroke-width="2" opacity="0.75"/>`,
    )
  }

  let y = HEADER_HEIGHT
  for (const row of rows) {
    const h = rowHeight(row)

    if (row.kind === 'group') {
      const accent = GROUP_ACCENT[row.accent] ?? GROUP_ACCENT['chart-1']!
      parts.push(
        `<rect x="0" y="${y}" width="${totalWidth}" height="${h}" fill="${accent.fill}" stroke="${accent.stroke}"/>`,
      )
      parts.push(
        `<text x="12" y="${y + 22}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" fill="#334155">${escapeXml(row.label.toUpperCase())}</text>`,
      )
    } else {
      parts.push(
        `<rect x="0" y="${y}" width="${LABEL_WIDTH}" height="${h}" fill="#ffffff" stroke="#e2e8f0"/>`,
      )
      parts.push(
        `<rect x="${LABEL_WIDTH}" y="${y}" width="${timelineWidth}" height="${h}" fill="#ffffff" stroke="#e2e8f0"/>`,
      )

      const assignees =
        row.item.assignees.map((s) => s.trim()).filter(Boolean).join(', ') || 'Sin responsables'
      const labelX = row.depth === 1 ? 20 : 12
      parts.push(
        `<text x="${labelX}" y="${y + 18}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="#0f172a">${escapeXml(row.item.name)}</text>`,
      )
      parts.push(
        `<text x="${labelX}" y="${y + 32}" font-family="Inter, system-ui, sans-serif" font-size="9" fill="#64748b">${escapeXml(assignees)}</text>`,
      )

      const drawBar = (
        range: { start: Date; end: Date } | null,
        top: number,
        barH: number,
        fill: string,
        stroke: string,
      ) => {
        if (!range) return
        const style = rangeToBarStyle(range, timeline)
        const x = LABEL_WIDTH + (style.leftPct / 100) * timelineWidth
        const w = Math.max(4, (style.widthPct / 100) * timelineWidth)
        parts.push(
          `<rect x="${x}" y="${y + top}" width="${w}" height="${barH}" rx="2" fill="${fill}" stroke="${stroke}"/>`,
        )
      }

      drawBar(row.planned, 10, 12, 'rgba(59,130,246,0.35)', 'rgba(59,130,246,0.55)')
      drawBar(row.actual, 26, 10, 'rgba(34,197,94,0.4)', 'rgba(22,163,74,0.55)')
    }

    y += h
  }

  parts.push('</svg>')
  return parts.join('')
}

function svgToPngDownload(svg: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas no disponible'))
        return
      }
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, img.width, img.height)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error('No se pudo generar PNG'))
            return
          }
          const blobUrl = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = blobUrl
          anchor.download = filename
          anchor.click()
          URL.revokeObjectURL(blobUrl)
          resolve()
        },
        'image/png',
        1,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Error al renderizar SVG'))
    }
    img.src = url
  })
}

export async function downloadGanttPng(
  plan: ProjectWorkPlan,
  projectTitle: string,
): Promise<boolean> {
  const timeline = buildGanttTimeline(plan)
  if (!timeline) return false
  const rows = buildGanttRows(plan)
  const widthPx = ganttTimelineWidthPx(timeline)
  const svg = renderGanttSvg(rows, timeline, widthPx, projectTitle)
  const base = sanitizeExportBaseName(projectTitle)
  await svgToPngDownload(svg, `${base}-gantt-${exportTimestamp()}.png`)
  return true
}
