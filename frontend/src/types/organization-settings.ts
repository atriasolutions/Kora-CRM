/** Datos del emisor que aparecen en la Orden de Compra (PDF). */
export type InvoicingMode = 'manual' | 'sii'

export type OrganizationSettings = {
  id?: string
  legalName: string
  tradeName: string
  tagline: string
  rut: string
  giro: string
  address: string
  city: string
  region: string
  commune: string
  phone: string
  email: string
  logoUrl: string
  /** IVA por defecto en documentos (ej. 19). */
  defaultVatPercent: number
  invoicingMode: InvoicingMode
  economicActivityCode: number | null
}
