import * as XLSX from 'xlsx'

import type { ReportFieldDef, ReportTableRow } from '@/types/report-table'

export function downloadReportAsExcel(
  filename: string,
  columns: ReportFieldDef[],
  rows: ReportTableRow[],
): void {
  const headers = columns.map((c) => c.label)
  const data = rows.map((row) => columns.map((c) => row[c.id] ?? ''))
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Datos')
  const safeName = filename.replace(/[^\w\s-áéíóúñ]/gi, '').trim() || 'reporte'
  XLSX.writeFile(workbook, `${safeName}.xlsx`)
}
