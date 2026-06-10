/** Dígitos nacionales (sin +56 ni cero inicial). */
export function normalizeChilePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('56')) digits = digits.slice(2)
  return digits
}

/** Móvil 9XXXXXXXX o fijo chileno de 9 dígitos (código de área incluido). */
export function isValidChilePhone(value: string): boolean {
  const digits = normalizeChilePhoneDigits(value.trim())
  if (digits.length !== 9) return false
  if (digits.startsWith('9')) return true
  return /^[2-7]/.test(digits)
}
