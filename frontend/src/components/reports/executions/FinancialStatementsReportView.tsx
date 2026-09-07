import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ContactFormDateInput, ContactFormInput } from '@/components/contacts/ContactFormField'
import { downloadFinancialStatementsExcel } from '@/lib/financial-statements-excel'
import type {
  FinancialStatementLine,
  FinancialStatementsManualLines,
  FinancialStatementsResult,
} from '@/types/financial-statements'
import { cn } from '@/lib/utils'

type Props = {
  result: FinancialStatementsResult
  dateFrom: string
  dateTo: string
  onPeriodChange: (from: string, to: string) => void
  onManualChange: (manual: FinancialStatementsManualLines) => void
  onRerun: () => void
  isRunning?: boolean
}

function StatementTable({
  title,
  lines,
}: {
  title: string
  lines: FinancialStatementLine[]
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium text-right">Monto</th>
              <th className="px-3 py-2 font-medium">Origen</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.id}
                className={cn(
                  'border-t border-border/70',
                  line.id === 'net' ||
                    line.id === 'gross' ||
                    line.id === 'operating' ||
                    line.id === 'assets' ||
                    line.id === 'liab_eq'
                    ? 'bg-muted/20 font-semibold'
                    : '',
                )}
              >
                <td className="px-3 py-2">
                  {line.label}
                  {line.note ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {line.note}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{line.amount}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{line.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function pesosToCentsInput(value: string): number {
  const n = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export function FinancialStatementsReportView({
  result,
  dateFrom,
  dateTo,
  onPeriodChange,
  onManualChange,
  onRerun,
  isRunning,
}: Props) {
  const [cash, setCash] = useState('')
  const [capital, setCapital] = useState('')
  const [cogs, setCogs] = useState('')

  const gaps = result.meta.gaps

  const summary = useMemo(
    () => [
      { label: 'Ingresos', value: result.incomeStatement.find((l) => l.id === 'revenue')?.amount },
      { label: 'Resultado periodo', value: result.incomeStatement.find((l) => l.id === 'net')?.amount },
      { label: 'CxC', value: result.balanceSheet.find((l) => l.id === 'ar')?.amount },
      { label: 'CxP', value: result.balanceSheet.find((l) => l.id === 'ap')?.amount },
    ],
    [result],
  )

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
        {result.meta.disclaimer}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <ContactFormDateInput
          id="ff-from"
          label="Desde"
          value={dateFrom}
          onChange={(v) => onPeriodChange(v, dateTo)}
        />
        <ContactFormDateInput
          id="ff-to"
          label="Hasta / corte"
          value={dateTo}
          onChange={(v) => onPeriodChange(dateFrom, v)}
        />
        <ContactFormInput
          id="ff-cash"
          label="Caja/Bancos (manual $)"
          value={cash}
          onChange={setCash}
          placeholder="0"
        />
        <ContactFormInput
          id="ff-capital"
          label="Capital (manual $)"
          value={capital}
          onChange={setCapital}
          placeholder="0"
        />
        <ContactFormInput
          id="ff-cogs"
          label="Costo de ventas (manual $)"
          value={cogs}
          onChange={setCogs}
          placeholder="Vacío = 0"
        />
        <Button
          type="button"
          variant="outline"
          disabled={isRunning}
          onClick={() => {
            onManualChange({
              cashCents: pesosToCentsInput(cash),
              capitalCents: pesosToCentsInput(capital),
              costOfSalesCents: cogs.trim() === '' ? null : pesosToCentsInput(cogs),
            })
            onRerun()
          }}
        >
          Recalcular
        </Button>
        <Button
          type="button"
          onClick={() =>
            downloadFinancialStatementsExcel(
              `EEFF_${result.meta.dateFrom}_${result.meta.dateTo}`,
              result,
            )
          }
        >
          <Download className="size-4" aria-hidden />
          Excel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums">{s.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {!result.meta.balanced || gaps.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Huecos / cuadre parcial</p>
          <ul className="mt-1 list-disc pl-4">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <StatementTable
        title={`Estado de resultados (${result.meta.dateFrom} — ${result.meta.dateTo})`}
        lines={result.incomeStatement}
      />
      <StatementTable
        title={`Estado de situación financiera al ${result.meta.dateTo}`}
        lines={result.balanceSheet}
      />
    </div>
  )
}
