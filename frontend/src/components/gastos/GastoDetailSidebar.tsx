import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ExpenseDetail } from '@/data/expenses.mock'
import { companyWebsiteHref } from '@/lib/company-display'
import { expenseObservationText } from '@/lib/expense-display'

type GastoDetailSidebarProps = {
  expense: ExpenseDetail
}

export function GastoDetailSidebar({ expense }: GastoDetailSidebarProps) {
  const notes = expenseObservationText(expense.internalNotes)

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Concepto</p>
            <p className="font-medium">{expense.concept}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categoría</p>
            <p className="font-medium">{expense.category}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <p className="font-medium">{expense.status}</p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className="font-medium tabular-nums">{expense.amount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="font-medium">{expense.expenseDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Medio de pago</p>
            <p className="font-medium">{expense.paymentMethod}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {expense.supplierId ? (
            <div>
              <p className="text-xs text-muted-foreground">Empresa</p>
              <Link
                to={`/empresas/${expense.supplierId}`}
                className="font-medium text-primary hover:underline"
              >
                {expense.supplierName || 'Ver empresa'}
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {expense.supplierName?.trim() || 'Sin proveedor vinculado'}
            </p>
          )}
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Responsable</p>
            <p className="font-medium">{expense.owner}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Préstamo de socio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {expense.isPartnerLoan ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Socio a devolver</p>
                {expense.partnerUserId ? (
                  <Link
                    to={`/usuarios/${expense.partnerUserId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {expense.partnerName || 'Ver socio'}
                  </Link>
                ) : (
                  <p className="font-medium">{expense.partnerName?.trim() || '—'}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado de devolución</p>
                <p className="font-medium">
                  {expense.partnerLoanReturned ? 'Devuelto' : 'Pendiente de devolución'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No es un préstamo de socio.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm lg:col-span-2 xl:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {notes || 'Sin observaciones.'}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm lg:col-span-2 xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Comprobantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expense.receiptUrls?.length ? (
            expense.receiptUrls.map((url, index) => (
              <a
                key={`${url}-${index}`}
                href={companyWebsiteHref(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 rounded-md border border-border/70 px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary"
              >
                <span className="min-w-0 flex-1 break-all">
                  Comprobante {index + 1}: {url}
                </span>
                <ExternalLink className="mt-0.5 size-4 shrink-0 opacity-60 group-hover:opacity-100" />
              </a>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin enlaces de comprobantes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
