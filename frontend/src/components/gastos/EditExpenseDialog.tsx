import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  ContactFormAmountInput,
  ContactFormCheckbox,
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ExpenseDetail } from '@/data/expenses.mock'
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseStatus,
} from '@/data/expenses.mock'
import { isSupplierCompany } from '@/lib/company-lookup'
import { validateCreateExpenseForm } from '@/lib/expense-create'
import {
  applyFormValuesToExpense,
  expenseDetailToFormValues,
  type ExpenseFormValues,
} from '@/lib/expense-form'

type EditExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseDetail
  onSave: (detail: ExpenseDetail) => void
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSave,
}: EditExpenseDialogProps) {
  const [form, setForm] = useState(() => expenseDetailToFormValues(expense))

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(expenseDetailToFormValues(expense))
    })
  }, [open, expense])

  const patch = (partial: Partial<ExpenseFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = () => {
    const error = validateCreateExpenseForm(form)
    if (error) {
      toast.error(error)
      return
    }
    onSave(applyFormValuesToExpense(expense, form))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar gasto</DialogTitle>
          <DialogDescription>
            Actualiza los datos de «{expense.number}».
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <ContactFormInput
            id="edit-gas-concept"
            label="Concepto"
            value={form.concept}
            onChange={(concept) => patch({ concept })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormSelect
              id="edit-gas-category"
              label="Categoría"
              value={form.category}
              onChange={(category) => patch({ category: category as ExpenseCategory })}
              options={EXPENSE_CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
            />
            <ContactFormSelect
              id="edit-gas-status"
              label="Estado"
              value={form.status}
              onChange={(status) => patch({ status: status as ExpenseStatus })}
              options={EXPENSE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormAmountInput
              id="edit-gas-amount"
              label="Monto (CLP)"
              value={form.amount}
              onChange={(amount) => patch({ amount })}
            />
            <ContactFormDateInput
              id="edit-gas-date"
              label="Fecha"
              value={form.expenseDate}
              onChange={(expenseDate) => patch({ expenseDate })}
            />
          </div>
          <ContactFormSelect
            id="edit-gas-payment"
            label="Medio de pago"
            value={form.paymentMethod}
            onChange={(paymentMethod) =>
              patch({ paymentMethod: paymentMethod as ExpensePaymentMethod })
            }
            options={EXPENSE_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
          />
          <CompanyLookupField
            label="Proveedor (opcional)"
            value={form.supplierId}
            filterCompany={isSupplierCompany}
            createInitialValues={{ lifecycle: 'Proveedor' }}
            searchPlaceholder="Buscar proveedor…"
            onChange={(supplierId, company) =>
              patch({
                supplierId,
                supplierName: company?.name ?? '',
              })
            }
          />
          <UserLookupField
            label="Responsable"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
          <ContactFormCheckbox
            id="edit-gas-partner-loan"
            label="Es préstamo de un socio"
            checked={form.isPartnerLoan}
            onChange={(isPartnerLoan) =>
              patch(
                isPartnerLoan
                  ? { isPartnerLoan: true }
                  : {
                      isPartnerLoan: false,
                      partnerUserId: '',
                      partnerName: '',
                      partnerLoanReturned: false,
                    },
              )
            }
          />
          {form.isPartnerLoan ? (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <UserLookupField
                label="Socio a devolver"
                value={form.partnerName}
                helperText="Selecciona el socio al que se debe devolver este préstamo."
                onChange={(partnerName, user) =>
                  patch({
                    partnerName,
                    partnerUserId: user?.id ?? '',
                  })
                }
              />
              <ContactFormCheckbox
                id="edit-gas-partner-returned"
                label="Ya fue devuelto"
                checked={form.partnerLoanReturned}
                onChange={(partnerLoanReturned) => patch({ partnerLoanReturned })}
              />
            </div>
          ) : null}
          <ContactFormTextarea
            id="edit-gas-receipt-urls"
            label="URLs de comprobantes"
            value={form.receiptUrlsText}
            onChange={(receiptUrlsText) => patch({ receiptUrlsText })}
            placeholder={'https://drive.google.com/…\nhttps://otro-repositorio.com/…'}
            rows={3}
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            Ingresa una URL por línea. Puedes agregar hasta 20 enlaces.
          </p>
          <ContactFormTextarea
            id="edit-gas-notes"
            label="Notas"
            value={form.notes}
            onChange={(notes) => patch({ notes })}
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
