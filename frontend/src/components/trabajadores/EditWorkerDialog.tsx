import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { WorkerFormFields } from '@/components/trabajadores/WorkerFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { WorkerDetail } from '@/data/workers.mock'
import {
  validateWorkerForm,
  workerDetailToFormValues,
  type WorkerFormValues,
} from '@/lib/worker-form'
import { parseWorkerAmountNum } from '@/lib/worker-display'

type EditWorkerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  worker: WorkerDetail
  onSave: (updated: WorkerDetail) => void
}

export function EditWorkerDialog({ open, onOpenChange, worker, onSave }: EditWorkerDialogProps) {
  const [form, setForm] = useState<WorkerFormValues>(() => workerDetailToFormValues(worker))

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setForm(workerDetailToFormValues(worker)))
  }, [open, worker])

  const patch = (partial: Partial<WorkerFormValues>) =>
    setForm((prev) => ({ ...prev, ...partial }))

  const handleSubmit = () => {
    const error = validateWorkerForm(form)
    if (error) {
      toast.error(error)
      return
    }
    const updated: WorkerDetail = {
      ...worker,
      number: form.number.trim() || worker.number,
      fullName: form.fullName.trim(),
      taxId: form.taxId.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      avatarUrl: form.avatarUrl.trim(),
      jobTitle: form.jobTitle.trim(),
      businessUnit: form.businessUnit.trim(),
      jobFunctions: form.jobFunctions.trim(),
      status: form.status,
      contractType: form.contractType,
      workHours: Number.parseInt(form.workHours, 10) || 0,
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim(),
      baseSalary: form.baseSalary,
      baseSalaryNum: parseWorkerAmountNum(form.baseSalary),
      gratification: form.gratification,
      gratificationNum: parseWorkerAmountNum(form.gratification),
      afpName: form.afpName.trim(),
      afpRate: Number.parseFloat(form.afpRate.replace(',', '.')) || 0,
      healthInstitution: form.healthInstitution.trim(),
      healthPlan: form.healthPlan.trim(),
      afcRate: Number.parseFloat(form.afcRate.replace(',', '.')) || 0,
      vacationAdjustmentDays: Number.parseFloat(form.vacationAdjustmentDays.replace(',', '.')) || 0,
      paydayDay: Number.parseInt(form.paydayDay, 10) || 5,
      owner: form.ownerName.trim(),
    }
    onSave(updated)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar trabajador</DialogTitle>
          <DialogDescription>Actualiza la ficha de {worker.fullName}.</DialogDescription>
        </DialogHeader>

        <WorkerFormFields form={form} patch={patch} />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
