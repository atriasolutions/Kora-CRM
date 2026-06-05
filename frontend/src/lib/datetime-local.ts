import {
  formatChileDatetimeLocal,
  parseChileDatetimeInput,
  parseChileDatetimeLocal,
} from '@/lib/chile-timezone'

/** Valor para `<input type="datetime-local" />` en hora Chile. */
export function toDatetimeLocalValue(date: Date = new Date()): string {
  return formatChileDatetimeLocal(date)
}

export { formatChileDatetimeLocal, parseChileDatetimeLocal, parseChileDatetimeInput }
