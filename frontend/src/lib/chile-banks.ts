export type ChileBank = {
  code: string
  name: string
}

export const CHILE_BANKS: ChileBank[] = [
  { code: 'banco_chile', name: 'Banco de Chile' },
  { code: 'banco_estado', name: 'BancoEstado' },
  { code: 'banco_santander', name: 'Banco Santander' },
  { code: 'banco_bci', name: 'Banco BCI' },
  { code: 'banco_scotiabank', name: 'Scotiabank Chile' },
  { code: 'banco_itau', name: 'Banco Itaú Chile' },
  { code: 'banco_security', name: 'Banco Security' },
  { code: 'banco_falabella', name: 'Banco Falabella' },
  { code: 'banco_ripley', name: 'Banco Ripley' },
  { code: 'banco_consorcio', name: 'Banco Consorcio' },
  { code: 'banco_bice', name: 'Banco BICE' },
  { code: 'banco_internacional', name: 'Banco Internacional' },
  { code: 'banco_edwards', name: 'Banco Edwards Citi' },
  { code: 'banco_credito_inversiones', name: 'Banco de Crédito e Inversiones' },
  { code: 'banco_cooperativo', name: 'Banco Cooperativo Coopera' },
  { code: 'banco_paris', name: 'Banco Paris' },
  { code: 'banco_desarrollo', name: 'Banco del Desarrollo' },
  { code: 'banco_hsbc', name: 'HSBC Bank Chile' },
  { code: 'banco_jp_morgan', name: 'JP Morgan Chase Bank' },
  { code: 'banco_bbva', name: 'BBVA Chile' },
  { code: 'banco_coopeuch', name: 'Coopeuch' },
  { code: 'prepago_los_heroes', name: 'Prepago Los Héroes' },
  { code: 'otro', name: 'Otro' },
]

export const CHILE_ACCOUNT_TYPES = [
  'Cuenta Corriente',
  'Cuenta Vista',
  'Cuenta de Ahorro',
  'Cuenta RUT',
  'Cuenta Chequera Electrónica',
  'Otra',
] as const

export type ChileAccountType = (typeof CHILE_ACCOUNT_TYPES)[number]

export function chileBankLabel(code: string): string {
  return CHILE_BANKS.find((b) => b.code === code)?.name ?? code
}
