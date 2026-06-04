const MONTHS_ES: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
}

export function formatPurchaseDisplayDate(date: Date): string {
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function parsePurchaseDisplayDate(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 3) {
    const day = Number.parseInt(parts[0] ?? '', 10)
    const monthKey = (parts[1] ?? '').replace(/\./g, '').toLowerCase().slice(0, 3)
    const year = Number.parseInt(parts[2] ?? '', 10)
    const month = MONTHS_ES[monthKey]
    if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
      const d = new Date(year, month, day, 12, 0, 0)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }

  const fallback = new Date(trimmed)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** Valor para `<input type="date" />` (yyyy-mm-dd). */
export function purchaseDisplayDateToInput(value: string): string {
  const d = parsePurchaseDisplayDate(value)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Convierte yyyy-mm-dd del date picker a texto de ficha (es-CL). */
export function purchaseInputDateToDisplay(iso: string): string {
  if (!iso.trim()) return ''
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return formatPurchaseDisplayDate(d)
}
