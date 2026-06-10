export type ChileBank = {
  /** Código SBIF / catálogo de transferencias (valor numérico como string). */
  code: string
  name: string
}

/** Listado alineado a catálogo de bancos para transferencias en Chile (2026). */
export const CHILE_BANKS: ChileBank[] = [
  { code: '1', name: 'Banco de Chile / Edwards / Credichile' },
  { code: '12', name: 'Banco Estado' },
  { code: '14', name: 'Banco Scotiabank' },
  { code: '16', name: 'Banco Bci / Mach' },
  { code: '27', name: 'Banco CORP Banca' },
  { code: '28', name: 'Banco Bice' },
  { code: '37', name: 'Banco Santander / Banefe' },
  { code: '39', name: 'Banco ITAU' },
  { code: '49', name: 'Banco Security' },
  { code: '51', name: 'Banco Falabella' },
  { code: '504', name: 'Banco BBVA' },
  { code: '507', name: 'Banco del Desarrollo' },
  { code: '31', name: 'HSBC Bank' },
  { code: '9', name: 'Banco Internacional' },
  { code: '53', name: 'Banco Ripley' },
  { code: '55', name: 'Banco Consorcio' },
  { code: '57', name: 'Banco Paris' },
  { code: '62', name: 'Tanner' },
  { code: '672', name: 'Coopeuch / Dale' },
  { code: '729', name: 'Prepago Los Heroes' },
  { code: '730', name: 'TENPO Prepago S.A.' },
  { code: '875', name: 'Mercado Pago' },
  { code: '732', name: 'TAPP Caja los Andes' },
  { code: '697', name: 'La Polar Prepago' },
  { code: '741', name: 'Copec Pay' },
  { code: '738', name: 'Global66' },
  { code: '743', name: 'Prex' },
  { code: '746', name: 'Fintual' },
  { code: '41', name: 'JP Morgan' },
  { code: '747', name: 'MetroMuv' },
  { code: '744', name: 'SumUp' },
  { code: '699', name: 'Tricot Prepago' },
  { code: '739', name: 'Haulmer' },
]

/** Slugs antiguos del catálogo inicial → código numérico actual. */
export const LEGACY_CHILE_BANK_CODES: Record<string, string> = {
  banco_chile: '1',
  banco_edwards: '1',
  banco_estado: '12',
  banco_scotiabank: '14',
  banco_bci: '16',
  banco_credito_inversiones: '16',
  banco_santander: '37',
  banco_itau: '39',
  banco_security: '49',
  banco_falabella: '51',
  banco_bbva: '504',
  banco_desarrollo: '507',
  banco_hsbc: '31',
  banco_internacional: '9',
  banco_ripley: '53',
  banco_consorcio: '55',
  banco_bice: '28',
  banco_paris: '57',
  banco_coopeuch: '672',
  prepago_los_heroes: '729',
  banco_jp_morgan: '41',
  otro: '1',
}

export const CHILE_ACCOUNT_TYPES = [
  'Cuenta Corriente',
  'Cuenta Vista',
  'Cuenta de Ahorro',
  'Cuenta RUT',
  'Cuenta Chequera Electrónica',
  'Otra',
] as const

export type ChileAccountType = (typeof CHILE_ACCOUNT_TYPES)[number]

const bankByCode = new Map(CHILE_BANKS.map((b) => [b.code, b]))

export function normalizeChileBankCode(code: string): string {
  const trimmed = code.trim()
  return LEGACY_CHILE_BANK_CODES[trimmed] ?? trimmed
}

export function chileBankLabel(code: string): string {
  const normalized = normalizeChileBankCode(code)
  return bankByCode.get(normalized)?.name ?? code
}

export function isValidChileBankCode(code: string): boolean {
  return bankByCode.has(normalizeChileBankCode(code))
}

export function isValidChileAccountType(type: string): boolean {
  return (CHILE_ACCOUNT_TYPES as readonly string[]).includes(type)
}

export function resolveChileBankName(code: string): string | undefined {
  return bankByCode.get(normalizeChileBankCode(code))?.name
}
