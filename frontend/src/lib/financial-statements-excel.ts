import * as XLSX from 'xlsx'

import type { FinancialStatementsResult } from '@/types/financial-statements'

function sheetFromLines(
  title: string[],
  lines: { label: string; amount: string; source?: string; note?: string }[],
) {
  const rows = [
    title,
    ['Concepto', 'Monto', 'Origen', 'Nota'],
    ...lines.map((l) => [l.label, l.amount, l.source ?? '', l.note ?? '']),
  ]
  return XLSX.utils.aoa_to_sheet(rows)
}

function sheetFromObjects(rows: Record<string, unknown>[], fallbackHeaders: string[]) {
  if (rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([fallbackHeaders])
  }
  return XLSX.utils.json_to_sheet(rows)
}

export function downloadFinancialStatementsExcel(
  filename: string,
  data: FinancialStatementsResult,
): void {
  const wb = XLSX.utils.book_new()
  const meta = [
    `Empresa: ${data.meta.companyName}`,
    `Periodo: ${data.meta.dateFrom} — ${data.meta.dateTo}`,
    data.meta.disclaimer,
  ]

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromLines(meta, data.incomeStatement),
    'Estado_Resultados',
  )
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromLines(meta, data.balanceSheet),
    'Situacion_Financiera',
  )
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(data.annexes.expensesByCategory, ['category', 'amount']),
    'Gastos_por_categoria',
  )
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(data.annexes.cxc, ['date', 'party', 'folio', 'balance']),
    'CxC',
  )
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(data.annexes.cxp, ['date', 'party', 'folio', 'balance']),
    'CxP',
  )
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(data.annexes.inventory, ['sku', 'name', 'quantity', 'valued']),
    'Inventario',
  )
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(data.annexes.partners, ['date', 'concept', 'total']),
    'Movimientos_socios',
  )

  const safeName =
    filename.replace(/[^\w\s-áéíóúñ]/gi, '').trim() || 'estados-financieros'
  XLSX.writeFile(wb, `${safeName}.xlsx`)
}
