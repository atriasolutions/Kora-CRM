import { useState } from 'react'
import { Download, FileText, Plus, Trash2 } from 'lucide-react'

import {
  ContactFormAmountInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { WorkerDetail, WorkerPayrollListItem } from '@/data/workers.mock'
import {
  createPayrollApi,
  deletePayrollApi,
  markPayrollPaidApi,
  payrollPdfUrl,
} from '@/api/workers'
import { apiActionErrorMessage } from '@/api/errors'
import { formatCentsToMoney } from '@/lib/worker-display'
import { parseWorkerAmountNum } from '@/lib/worker-display'
import { toast } from '@/lib/toast'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type WorkerPayrollsPanelProps = {
  worker: WorkerDetail
  canEdit: boolean
  onChanged: () => void
}

export function WorkerPayrollsPanel({ worker, canEdit, onChanged }: WorkerPayrollsPanelProps) {
  const now = new Date()
  const [periodYear, setPeriodYear] = useState(String(now.getFullYear()))
  const [periodMonth, setPeriodMonth] = useState(String(now.getMonth() + 1))
  const [daysWorked, setDaysWorked] = useState('30')
  const [daysVacation, setDaysVacation] = useState('0')
  const [daysLicense, setDaysLicense] = useState('0')
  const [daysAbsence, setDaysAbsence] = useState('0')
  const [incomeTax, setIncomeTax] = useState('$0')
  const [nonTaxable, setNonTaxable] = useState('$0')
  const [busy, setBusy] = useState(false)
  const [detailPayroll, setDetailPayroll] = useState<WorkerPayrollListItem | null>(null)

  const handleGenerate = async () => {
    setBusy(true)
    try {
      await createPayrollApi(worker.id, {
        periodYear: Number.parseInt(periodYear, 10) || now.getFullYear(),
        periodMonth: Number.parseInt(periodMonth, 10) || now.getMonth() + 1,
        daysWorked: Number.parseFloat(daysWorked) || 0,
        daysVacation: Number.parseFloat(daysVacation) || 0,
        daysLicense: Number.parseFloat(daysLicense) || 0,
        daysAbsence: Number.parseFloat(daysAbsence) || 0,
        incomeTaxCents: parseWorkerAmountNum(incomeTax) * 100,
        nonTaxableCents: parseWorkerAmountNum(nonTaxable) * 100,
      })
      toast.success('Liquidación generada.')
      onChanged()
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo generar la liquidación.'))
    } finally {
      setBusy(false)
    }
  }

  const togglePaid = async (payroll: WorkerPayrollListItem) => {
    try {
      await markPayrollPaidApi(worker.id, payroll.id, !payroll.paidAt)
      onChanged()
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo actualizar el pago.'))
    }
  }

  const handleDelete = async (payrollId: string) => {
    try {
      await deletePayrollApi(worker.id, payrollId)
      toast.success('Liquidación eliminada.')
      onChanged()
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo eliminar la liquidación.'))
    }
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Generar liquidación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <ContactFormSelect
                id="pay-month"
                label="Mes"
                value={periodMonth}
                onChange={setPeriodMonth}
                options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
              />
              <ContactFormInput
                id="pay-year"
                label="Año"
                inputVariant="integer"
                value={periodYear}
                onChange={setPeriodYear}
              />
              <ContactFormInput
                id="pay-days-worked"
                label="Días trabajados"
                value={daysWorked}
                onChange={setDaysWorked}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ContactFormInput
                id="pay-days-vacation"
                label="Días vacaciones"
                value={daysVacation}
                onChange={setDaysVacation}
              />
              <ContactFormInput
                id="pay-days-license"
                label="Días licencia"
                value={daysLicense}
                onChange={setDaysLicense}
              />
              <ContactFormInput
                id="pay-days-absence"
                label="Días ausencia"
                value={daysAbsence}
                onChange={setDaysAbsence}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactFormAmountInput
                id="pay-income-tax"
                label="Impuesto único (CLP)"
                value={incomeTax}
                onChange={setIncomeTax}
              />
              <ContactFormAmountInput
                id="pay-non-taxable"
                label="Haberes no imponibles (CLP)"
                value={nonTaxable}
                onChange={setNonTaxable}
              />
            </div>
            <div className="flex justify-end">
              <Button type="button" size="sm" disabled={busy} onClick={handleGenerate}>
                <Plus aria-hidden className="size-4" />
                Generar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Liquidaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {worker.payrolls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin liquidaciones generadas.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {worker.payrolls.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start text-start"
                    onClick={() => setDetailPayroll(p)}
                  >
                    <span className="font-medium text-foreground">{p.periodLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      Líquido {p.net} · {p.daysWorked} días
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={p.paidAt ? 'customer' : 'muted'}>
                      {p.paidAt ? 'Pagada' : 'Pendiente'}
                    </Badge>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground"
                      aria-label="Ver PDF"
                      asChild
                    >
                      <a href={payrollPdfUrl(worker.id, p.id)} target="_blank" rel="noreferrer">
                        <Download aria-hidden className="size-4" />
                      </a>
                    </Button>
                    {canEdit ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-border"
                          onClick={() => togglePaid(p)}
                        >
                          {p.paidAt ? 'Marcar pendiente' : 'Marcar pagada'}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label="Eliminar"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailPayroll !== null} onOpenChange={(o) => !o && setDetailPayroll(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText aria-hidden className="size-5" />
              Liquidación {detailPayroll?.periodLabel}
            </DialogTitle>
            <DialogDescription>Detalle de haberes y descuentos.</DialogDescription>
          </DialogHeader>
          {detailPayroll ? (
            <div className="space-y-4">
              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Haberes</h4>
                <ul className="text-sm">
                  {detailPayroll.earnings.map((e, i) => (
                    <li key={i} className="flex justify-between py-1">
                      <span>{e.label}</span>
                      <span className="tabular-nums">{formatCentsToMoney(e.amountCents)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-border py-1 font-semibold">
                    <span>Total haberes</span>
                    <span className="tabular-nums">{formatCentsToMoney(detailPayroll.grossCents)}</span>
                  </li>
                </ul>
              </section>
              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Descuentos</h4>
                <ul className="text-sm">
                  {detailPayroll.deductions.map((d, i) => (
                    <li key={i} className="flex justify-between py-1">
                      <span>{d.label}</span>
                      <span className="tabular-nums">{formatCentsToMoney(d.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <div className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-base font-semibold">
                <span>Líquido a pagar</span>
                <span className="tabular-nums text-primary">{detailPayroll.net}</span>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" className="border-border" asChild>
                  <a href={payrollPdfUrl(worker.id, detailPayroll.id)} target="_blank" rel="noreferrer">
                    <Download aria-hidden className="size-4" />
                    Descargar / Imprimir
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
