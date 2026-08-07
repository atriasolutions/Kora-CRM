import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { apiActionErrorMessage } from '@/api/errors'
import { updateCompanyMonthlyQuotaApi } from '@/api/bitacora'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { isValidBitacoraHours, parseBitacoraHoursInput } from '@/lib/bitacora-form'

type BitacoraMonthlyQuotaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  currentAssignedHours: number | null
  onSaved: () => void
}

export function BitacoraMonthlyQuotaDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  currentAssignedHours,
  onSaved,
}: BitacoraMonthlyQuotaDialogProps) {
  const [hoursInput, setHoursInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setHoursInput(
      currentAssignedHours != null ? String(currentAssignedHours).replace('.', ',') : '',
    )
  }, [open, currentAssignedHours])

  const handleSave = async () => {
    const trimmed = hoursInput.trim()
    let monthlyAssignedHours: number | null = null
    if (trimmed) {
      const parsed = parseBitacoraHoursInput(trimmed)
      if (parsed == null || !isValidBitacoraHours(parsed)) {
        toast.error('Indica un valor válido (mínimo 0,5 h, múltiplos de 0,5).')
        return
      }
      monthlyAssignedHours = parsed
    }

    setSaving(true)
    try {
      await updateCompanyMonthlyQuotaApi(companyId, monthlyAssignedHours)
      toast.success(
        monthlyAssignedHours != null
          ? `Cuota mensual de ${companyName} actualizada.`
          : `Cuota mensual de ${companyName} eliminada.`,
      )
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo guardar la cuota mensual de horas.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cuota mensual de horas</DialogTitle>
          <DialogDescription>
            Horas asignadas al mes para <span className="font-medium">{companyName}</span>. Se
            comparan con las horas registradas en bitácora del mes en curso (o del mes filtrado).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label
            htmlFor="monthly-assigned-hours"
            className="text-sm font-medium leading-none text-foreground"
          >
            Horas mensuales asignadas
          </label>
          <Input
            id="monthly-assigned-hours"
            inputMode="decimal"
            placeholder="Ej. 25"
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            Deja vacío para quitar la cuota y volver a la vista estándar del dashboard.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
