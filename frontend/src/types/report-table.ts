/** Fuente de datos CRM para tablas dinámicas. */
export type ReportDataSourceId =
  | 'contactos'
  | 'empresas'
  | 'oportunidades'
  | 'actividades'
  | 'productos'
  | 'facturas'
  | 'proyectos'
  | 'cotizaciones'
  | 'compras'
  | 'ingresos'
  | 'inventario'

export type ReportFieldType = 'text' | 'number' | 'date' | 'picklist' | 'lookup' | 'boolean'

export type ReportFieldDef = {
  id: string
  label: string
  type: ReportFieldType
  /** Para picklists/lookups/boolean: valores válidos para filtrar (y opcionalmente mostrar). */
  options?: { value: string; label: string }[]
}

export type ReportFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater'
  | 'less'
  | 'is_empty'
  | 'is_not_empty'

export type ReportFilterCondition = {
  id: string
  fieldId: string
  operator: ReportFilterOperator
  value: string
}

/** Todas las condiciones con Y, cualquiera con O, o expresión personalizada. */
export type ReportFilterCombineMode = 'all-and' | 'any-or' | 'custom'

export type ReportTableConfig = {
  dataSource: ReportDataSourceId
  /** Join opcional (máximo 1 relación) para traer campos del relacionado. */
  joinId?: string
  /** IDs de columnas visibles, en orden. */
  columnIds: string[]
  conditions: ReportFilterCondition[]
  combineMode: ReportFilterCombineMode
  /** Ej: `1 Y 2 O ((3 Y 4) O 5)` — índices 1-based. */
  customExpression: string
}

export type ReportTableRow = Record<string, string>

export type ReportTableRunResult = {
  columns: ReportFieldDef[]
  rows: ReportTableRow[]
  totalBeforeFilter: number
}

export const REPORT_FILTER_OPERATOR_LABELS: Record<ReportFilterOperator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  greater: 'mayor que',
  less: 'menor que',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
}

export const REPORT_DATA_SOURCE_LABELS: Record<ReportDataSourceId, string> = {
  contactos: 'Contactos',
  empresas: 'Empresas',
  oportunidades: 'Oportunidades',
  actividades: 'Actividades',
  productos: 'Productos',
  facturas: 'Facturación',
  proyectos: 'Proyectos',
  cotizaciones: 'Cotizaciones',
  compras: 'Compras',
  ingresos: 'Ingresos',
  inventario: 'Inventario',
}

export function createDefaultReportTableConfig(
  partial?: Partial<ReportTableConfig>,
): ReportTableConfig {
  const dataSource = partial?.dataSource ?? 'contactos'
  return {
    dataSource,
    joinId: partial?.joinId,
    columnIds: partial?.columnIds ?? [],
    conditions: partial?.conditions ?? [],
    combineMode: partial?.combineMode ?? 'all-and',
    customExpression: partial?.customExpression ?? '',
  }
}
