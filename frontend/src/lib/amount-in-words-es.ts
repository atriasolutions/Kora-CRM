const UNITS = [
  '',
  'UN',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
]

const TENS = [
  '',
  '',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
]

const HUNDREDS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
]

function under100(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  if (n < 20) return UNITS[n]!
  if (n < 30) return n === 20 ? 'VEINTE' : `VEINTI${UNITS[n - 20]!.toLowerCase()}`.toUpperCase()
  const ten = Math.floor(n / 10)
  const unit = n % 10
  if (unit === 0) return TENS[ten]!
  return `${TENS[ten]} Y ${UNITS[unit]}`
}

function under1000(n: number): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  const hundredPart = h === 1 && rest === 0 ? 'CIEN' : h > 0 ? HUNDREDS[h]! : ''
  const restPart = under100(rest)
  return [hundredPart, restPart].filter(Boolean).join(' ')
}

/** Convierte montos enteros CLP a palabras (aprox. estilo documento tributario). */
export function amountInWordsSpanish(amount: number): string {
  const n = Math.round(Math.max(0, amount))
  if (n === 0) return 'CERO'

  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  const parts: string[] = []
  if (millions > 0) {
    parts.push(
      millions === 1 ? 'UN MILLÓN' : `${under1000(millions)} MILLONES`,
    )
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'MIL' : `${under1000(thousands)} MIL`)
  }
  if (rest > 0) {
    parts.push(under1000(rest))
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
