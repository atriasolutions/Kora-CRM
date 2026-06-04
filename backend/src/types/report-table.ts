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

export type ReportFilterCombineMode = 'all-and' | 'any-or' | 'custom'

export type ReportTableConfig = {
  dataSource: ReportDataSourceId
  joinId?: string
  columnIds: string[]
  conditions: ReportFilterCondition[]
  combineMode: ReportFilterCombineMode
  customExpression: string
}

export type ReportFieldDef = {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'picklist' | 'lookup' | 'boolean'
}

export type ReportTableRow = Record<string, string>

export type ReportTableRunResult = {
  columns: ReportFieldDef[]
  rows: ReportTableRow[]
  totalBeforeFilter: number
}
