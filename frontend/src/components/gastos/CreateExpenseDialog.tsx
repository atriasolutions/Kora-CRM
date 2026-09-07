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
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_DOCUMENT_TYPE_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseStatus,
} from '@/data/expenses.mock'
import { isSupplierCompany } from '@/lib/company-lookup'
import {
  createDefaultExpenseFormValues,
  validateCreateExpenseForm,
  type CreateExpenseFormValues,
} from '@/lib/expense-create'

type CreateExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateExpenseFormValues>
  onSubmit: (values: CreateExpenseFormValues) => void
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  title = 'Nuevo gasto',
  description = 'Registra un egreso operativo de la empresa.',
  initialValues,
  onSubmit,
}: CreateExpenseDialogProps) {
  const [form, setForm] = useState(() => createDefaultExpenseFormValues(initialValues))

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultExpenseFormValues(initialValues))
    })
  }, [open, initialValues])

  const patch = (partial: Partial<CreateExpenseFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = () => {
    const error = validateCreateExpenseForm(form)
    if (error) {
      toast.error(error)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <ContactFormInput
            id="create-gas-concept"
            label="Concepto"
            value={form.concept}
            onChange={(concept) => patch({ concept })}
            placeholder="Ej. Arriendo oficina"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormSelect
              id="create-gas-category"
              label="Categoría"
              value={form.category}
              onChange={(category) => patch({ category: category as ExpenseCategory })}
              options={EXPENSE_CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
            />
            <ContactFormSelect
              id="create-gas-status"
              label="Estado"
              value={form.status}
              onChange={(status) => patch({ status: status as ExpenseStatus })}
              options={EXPENSE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormAmountInput
              id="create-gas-amount"
              label="Monto (CLP)"
              value={form.amount}
              onChange={(amount) => patch({ amount })}
            />
            <ContactFormDateInput
              id="create-gas-date"
              label="Fecha"
              value={form.expenseDate}
              onChange={(expenseDate) => patch({ expenseDate })}
            />
          </div>
          <ContactFormSelect
            id="create-gas-payment"
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
            id="create-gas-partner-loan"
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
                id="create-gas-partner-returned"
                label="Ya fue devuelto"
                checked={form.partnerLoanReturned}
                onChange={(partnerLoanReturned) => patch({ partnerLoanReturned })}
              />
            </div>
          ) : null}
          <ContactFormTextarea
            id="create-gas-receipt-urls"
            label="URLs de comprobantes"
            value={form.receiptUrlsText}
            onChange={(receiptUrlsText) => patch({ receiptUrlsText })}
            placeholder={'https://drive.google.com/…\nhttps://otro-repositorio.com/…'}
            rows={3}
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            Ingresa una URL por línea. Puedes agregar hasta 20 enlaces.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormSelect
              id="create-gas-doc-type"
              label="Tipo documento"
              value={form.documentType}
              onChange={(documentType) => patch({ documentType })}
              options={[...EXPENSE_DOCUMENT_TYPE_OPTIONS]}
            />
            <ContactFormInput
              id="create-gas-doc-folio"
              label="Folio documento"
              value={form.documentFolio}
              onChange={(documentFolio) => patch({ documentFolio })}
              placeholder="Ej. 12345"
            />
          </div>
          <ContactFormTextarea
            id="create-gas-notes"
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
            Crear gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
