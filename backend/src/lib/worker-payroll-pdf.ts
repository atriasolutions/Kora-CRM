import type { WorkerPayrollListItem } from '../types/worker.js'
import { formatCentsToMoney } from '../utils/money.js'

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type WorkerSnapshot = {
  fullName?: string
  taxId?: string
  jobTitle?: string
  businessUnit?: string
  contractType?: string
  number?: string
}

/**
 * Genera un HTML imprimible (Ctrl+P → Guardar como PDF) para la liquidación.
 * El repo no incluye dependencias de PDF; se entrega HTML printable como en boletas/cotizaciones.
 */
export function renderPayrollHtml(
  payroll: WorkerPayrollListItem,
  snapshot: WorkerSnapshot,
): string {
  const earningsRows = payroll.earnings
    .map(
      (e) =>
        `<tr><td>${esc(e.label)}</td><td class="num">${esc(formatCentsToMoney(e.amountCents))}</td></tr>`,
    )
    .join('')
  const deductionRows = payroll.deductions
    .map(
      (d) =>
        `<tr><td>${esc(d.label)}</td><td class="num">${esc(formatCentsToMoney(d.amountCents))}</td></tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Liquidación ${esc(snapshot.fullName)} · ${esc(payroll.periodLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; background: #f8fafc; }
  .sheet { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 24px 0 8px; }
  .muted { color: #6b7280; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin-top: 8px; }
  .grid div span { color: #6b7280; }
  .totals { margin-top: 16px; display: flex; justify-content: space-between; font-weight: 600; font-size: 16px; padding: 12px 10px; background: #f8fafc; border-radius: 8px; }
  .print-hint { text-align: center; margin-top: 20px; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; } .print-hint { display: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <h1>Liquidación de sueldo</h1>
    <p class="muted">${esc(payroll.periodLabel)}</p>
    <div class="grid">
      <div><span>Trabajador:</span> ${esc(snapshot.fullName)}</div>
      <div><span>RUT:</span> ${esc(snapshot.taxId)}</div>
      <div><span>Cargo:</span> ${esc(snapshot.jobTitle)}</div>
      <div><span>Unidad:</span> ${esc(snapshot.businessUnit)}</div>
      <div><span>Contrato:</span> ${esc(snapshot.contractType)}</div>
      <div><span>Ficha N°:</span> ${esc(snapshot.number)}</div>
      <div><span>Días trabajados:</span> ${esc(payroll.daysWorked)}</div>
      <div><span>Días vacaciones:</span> ${esc(payroll.daysVacation)}</div>
      <div><span>Días licencia:</span> ${esc(payroll.daysLicense)}</div>
      <div><span>Días ausencia:</span> ${esc(payroll.daysAbsence)}</div>
    </div>

    <h2>Haberes</h2>
    <table><tbody>${earningsRows}
      <tr><td><strong>Total haberes</strong></td><td class="num"><strong>${esc(formatCentsToMoney(payroll.grossCents))}</strong></td></tr>
    </tbody></table>

    <h2>Descuentos</h2>
    <table><tbody>${deductionRows || '<tr><td class="muted">Sin descuentos</td><td></td></tr>'}</tbody></table>

    <div class="totals">
      <span>Líquido a pagar</span>
      <span>${esc(formatCentsToMoney(payroll.netCents))}</span>
    </div>
    ${payroll.overdraftCents > 0 ? `<p class="muted">Sobregiro: ${esc(formatCentsToMoney(payroll.overdraftCents))}</p>` : ''}
    <p class="print-hint muted">Usa Imprimir (Ctrl/Cmd + P) y elige «Guardar como PDF».</p>
  </div>
</body>
</html>`
}
