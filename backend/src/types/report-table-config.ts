/** Espejo del JSON almacenado en crm_reports.table_config (validación laxa en API). */
export type ReportTableConfig = {
  dataSource: string
  joinId?: string
  columnIds: string[]
  conditions: {
    id: string
    fieldId: string
    operator: string
    value: string
  }[]
  combineMode: string
  customExpression: string
  reportTypeLabel?: string
}
