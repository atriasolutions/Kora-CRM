export const EXPENSE_CATEGORIES = [
  // Operativas
  'Impuestos',
  'Arriendo',
  'Servicios',
  'Software',
  'Equipos',
  'Salarios',
  'Retiros',
  'Marketing',
  'Transporte',
  'Seguros',
  'Mantención',
  'Otros',
  // Planilla gastos menores (contador)
  'Peajes',
  'Viáticos',
  'Permisos de circulación',
  'Seguros SOAP',
  'Contribuciones',
  'Patente Comercial',
  'Gastos menores con boletas',
  'Arriendos sin factura',
  'Fletes',
  'Finiquitos',
  'Pagos o Gastos Judiciales',
  'Retiros Socios',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/** Categorías típicas de la planilla de gastos menores (requieren respaldo). */
export const EXPENSE_MINOR_CATEGORIES = [
  'Peajes',
  'Viáticos',
  'Permisos de circulación',
  'Seguros SOAP',
  'Contribuciones',
  'Patente Comercial',
  'Gastos menores con boletas',
  'Arriendos sin factura',
  'Fletes',
  'Finiquitos',
  'Pagos o Gastos Judiciales',
  'Retiros Socios',
] as const

export const EXPENSE_DOCUMENT_TYPES = [
  '',
  'Boleta',
  'Factura',
  'Recibo',
  'Otro',
] as const

export type ExpenseDocumentType = (typeof EXPENSE_DOCUMENT_TYPES)[number]

/** Mapeo categoría → función contable (Estado de Resultados por función). */
export type ExpenseAccountingFunction = 'ventas' | 'administracion' | 'otro' | 'socios'

export const EXPENSE_CATEGORY_FUNCTION: Record<string, ExpenseAccountingFunction> = {
  Marketing: 'ventas',
  Fletes: 'ventas',
  Viáticos: 'ventas',
  Peajes: 'ventas',
  Transporte: 'ventas',
  Impuestos: 'administracion',
  Arriendo: 'administracion',
  'Arriendos sin factura': 'administracion',
  Servicios: 'administracion',
  Software: 'administracion',
  Salarios: 'administracion',
  Seguros: 'administracion',
  'Seguros SOAP': 'administracion',
  Mantención: 'administracion',
  Contribuciones: 'administracion',
  'Patente Comercial': 'administracion',
  'Permisos de circulación': 'administracion',
  'Gastos menores con boletas': 'administracion',
  'Pagos o Gastos Judiciales': 'administracion',
  Finiquitos: 'administracion',
  Equipos: 'otro',
  Otros: 'otro',
  Retiros: 'socios',
  'Retiros Socios': 'socios',
}

export const EXPENSE_STATUSES = ['Borrador', 'Registrado', 'Anulado'] as const

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export const EXPENSE_PAYMENT_METHODS = [
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Efectivo',
  'Crédito',
  'Otro',
] as const

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]

export type ExpenseListItem = {
  id: string
  number: string
  concept: string
  category: string
  expenseDate: string
  /** yyyy-mm-dd para ordenar/filtrar en cliente. */
  expenseDateIso: string
  amount: string
  amountNum: number
  currency: string
  paymentMethod: string
  status: string
  supplierId?: string
  supplierName?: string
  owner: string
  notes?: string
  receiptUrls: string[]
  documentType: string
  documentFolio: string
  isPartnerLoan: boolean
  partnerUserId?: string
  partnerName?: string
  partnerLoanReturned: boolean
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type ExpenseDetail = ExpenseListItem & {
  notes?: string
}

export type CreateExpenseInput = {
  number?: string
  concept?: string
  category?: string
  expenseDate?: string
  amount?: string
  amountCents?: number
  amountNum?: number
  currency?: string
  paymentMethod?: string
  status?: string
  supplierId?: string | null
  supplierName?: string
  notes?: string
  receiptUrls?: string[]
  documentType?: string
  documentFolio?: string
  isPartnerLoan?: boolean
  partnerUserId?: string | null
  partnerName?: string
  partnerLoanReturned?: boolean
  ownerName?: string
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>

export type ListExpensesParams = {
  page: number
  pageSize: number
  q?: string
  /** Uno o varios estados separados por coma. */
  status?: string
  /** Una o varias categorías separadas por coma. */
  category?: string
  /** Uno o varios métodos de pago separados por coma. */
  paymentMethod?: string
  supplierId?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
  /** Filtrar por owner_name = nombre del usuario actual. */
  ownerName?: string
}
