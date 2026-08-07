import { Settings2 } from 'lucide-react'

import { BitacoraMonthlyQuotaRing } from '@/components/bitacora/BitacoraMonthlyQuotaRing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { BitacoraDashboardMonthlyQuota } from '@/types/bitacora-dashboard'

type BitacoraMonthlyQuotaSectionProps = {
  quota: BitacoraDashboardMonthlyQuota
  companyName?: string
  canConfigure?: boolean
  onConfigure?: () => void
}

export function BitacoraMonthlyQuotaSection({
  quota,
  companyName,
  canConfigure,
  onConfigure,
}: BitacoraMonthlyQuotaSectionProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Cuota mensual · {quota.monthLabel}
          </CardTitle>
          <CardDescription>
            {companyName
              ? `Consumo de horas de ${companyName} frente a la asignación y al calendario del mes.`
              : 'Consumo de horas frente a la asignación mensual y al calendario del mes.'}
          </CardDescription>
        </div>
        {canConfigure && onConfigure ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={onConfigure}
          >
            <Settings2 aria-hidden className="size-3.5" />
            Editar cuota
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <BitacoraMonthlyQuotaRing quota={quota} className="lg:gap-8" />
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground sm:justify-start sm:text-left">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor:
                  quota.utilizationPercent > 100 ? 'hsl(0 72% 51%)' : 'hsl(217 91% 55%)',
              }}
            />
            Anillo exterior: horas utilizadas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            Anillo interior: avance del mes
          </span>
        </p>
      </CardContent>
    </Card>
  )
}
