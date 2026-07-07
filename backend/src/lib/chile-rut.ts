/** Validación y formato de RUT chileno (alineado con frontend/src/lib/contact-rut.ts). */

export function normalizeRutInput(rut: string): string {
  return rut.replace(/[^\dkK]/gi, '').toUpperCase()
}

export function formatRutDisplay(rut: string): string {
  const clean = normalizeRutInput(rut)
  if (clean.length < 2) return rut.trim()
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}

export function getRutValidationMessage(rut: string, required = true): string | null {
  const trimmed = rut.trim()
  if (!trimmed) {
    return required ? 'El RUT es obligatorio.' : null
  }

  const clean = normalizeRutInput(trimmed)
  if (clean.length < 2) {
    return 'Ingresa el RUT completo, incluyendo el dígito verificador.'
  }

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)

  if (!/^\d+$/.test(body)) {
    return 'El RUT solo debe contener números antes del dígito verificador.'
  }

  if (body.length < 7) {
    return 'El RUT debe tener al menos 7 dígitos antes del verificador.'
  }

  if (body.length > 8) {
    return 'El RUT no puede tener más de 8 dígitos antes del verificador.'
  }

  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number.parseInt(body[i]!, 10) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  const expected =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  if (dv !== expected) {
    return 'RUT inválido.'
  }

  return null
}

export function isValidChileanRut(rut: string): boolean {
  return getRutValidationMessage(rut, true) === null
}
