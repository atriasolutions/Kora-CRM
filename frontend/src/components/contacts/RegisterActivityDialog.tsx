import {
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { toast } from '@/lib/toast'

import { ActivityReminderFields } from '@/components/activities/ActivityReminderFields'
import {
  ContactFormDateTimeInput,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
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
  ACTIVITY_PRIORITY_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
} from '@/data/activities.mock'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import {
  ACTIVITY_TYPE_OPTIONS,
  contactActivityFromListItem,
  createDefaultActivityForm,
  defaultActivityTitle,
  type ActivityFormValues,
} from '@/lib/contact-activity'
import { contactFormToCreateValues } from '@/lib/contact-activities'
import { companyFormToCreateValues } from '@/lib/company-activities'
import { opportunityFormToCreateValues } from '@/lib/opportunity-activities'
import { inventoryFormToCreateValues } from '@/lib/inventory-activities'
import { invoiceFormToCreateValues } from '@/lib/invoice-activities'
import { productFormToCreateValues } from '@/lib/product-activities'
import { projectFormToCreateValues } from '@/lib/project-activities'
import { solicitudFormToCreateValues } from '@/lib/solicitud-activities'
import { purchaseFormToCreateValues } from '@/lib/purchase-activities'
import { quoteFormToCreateValues } from '@/lib/quote-activities'
import { stockReceiptFormToCreateValues } from '@/lib/stock-receipt-activities'
import type { ActivityRelatedType } from '@/data/activities.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { validateActivityReminder } from '@/lib/activity-reminder'
import { cn } from '@/lib/utils'

const typeIcons: Record<ContactActivityType, LucideIcon> = {
  llamada: Phone,
  email: Mail,
  reunion: Calendar,
  nota: StickyNote,
  whatsapp: MessageCircle,
}

type RegisterActivityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  relatedType?: ActivityRelatedType
  contactId: string
  contactName: string
  companyName?: string
  defaultAuthor: string
  presetType?: ContactActivityType
  onSaved: (activity: ContactActivity) => void
}

export function RegisterActivityDialog({
  open,
  onOpenChange,
  relatedType = 'contacto',
  contactId,
  contactName,
  companyName,
  defaultAuthor,
  presetType = 'llamada',
  onSaved,
}: RegisterActivityDialogProps) {
  const isCompany = relatedType === 'empresa'
  const isPurchase = relatedType === 'compra'
  const isOpportunity = relatedType === 'oportunidad'
  const isQuote = relatedType === 'cotizacion'
  const isInvoice = relatedType === 'factura'
  const isBoleta = relatedType === 'boleta'
  const isProject = relatedType === 'proyecto'
  const isSolicitud = relatedType === 'solicitud'
  const isStockReceipt = relatedType === 'ingreso'
  const isProduct = relatedType === 'producto'
  const isInventory = relatedType === 'inventario'
  const displayName =
    isPurchase || isStockReceipt
      ? contactName
      : isCompany || isOpportunity || isQuote || isInvoice || isBoleta || isProject || isSolicitud
        ? (companyName ?? contactName)
        : isProduct || isInventory
          ? contactName
          : contactName
  const { addActivity } = useActivitiesRegistry()
  const [form, setForm] = useState<ActivityFormValues>(() =>
    createDefaultActivityForm(defaultAuthor, presetType),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultActivityForm(defaultAuthor, presetType))
    })
  }, [open, defaultAuthor, presetType])

  const patch = (partial: Partial<ActivityFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial }
      if (partial.type && partial.type !== prev.type && !partial.title) {
        next.title = defaultActivityTitle(partial.type)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const reminderError = validateActivityReminder(form)
    if (reminderError) {
      toast.warning(reminderError)
      return
    }

    setSaving(true)
    try {
    const values = isPurchase
      ? purchaseFormToCreateValues(contactId, displayName, companyName ?? '', form)
      : isInvoice
        ? invoiceFormToCreateValues(
            contactId,
            contactName,
            companyName ?? contactName,
            form,
          )
        : isProject
          ? projectFormToCreateValues(
              contactId,
              contactName,
              companyName ?? contactName,
              form,
            )
          : isSolicitud
            ? solicitudFormToCreateValues(
                contactId,
                contactName,
                companyName ?? contactName,
                form,
              )
          : isStockReceipt
            ? stockReceiptFormToCreateValues(
                contactId,
                contactName,
                companyName ?? contactName,
                form,
              )
            : isProduct
              ? productFormToCreateValues(
                  contactId,
                  contactName,
                  companyName ?? contactName,
                  form,
                )
              : isInventory
                ? inventoryFormToCreateValues(
                    contactId,
                    contactName,
                    companyName ?? contactName,
                    form,
                  )
                : isCompany
                  ? companyFormToCreateValues(contactId, displayName, form)
                  : isOpportunity
                    ? opportunityFormToCreateValues(
                        contactId,
                        contactName,
                        companyName ?? contactName,
                        form,
                      )
                    : isQuote
                      ? quoteFormToCreateValues(
                          contactId,
                          contactName,
                          companyName ?? contactName,
                          form,
                        )
                      : contactFormToCreateValues(
                          contactId,
                          contactName,
                          companyName ?? contactName,
                          form,
                        )
    const item = await addActivity(values)
    const activity = contactActivityFromListItem(item, form.description)
    toast.success(`Actividad «${activity.title}» registrada correctamente.`)
    onSaved(activity)
    onOpenChange(false)
    } catch {
      toast.error('No se pudo registrar la actividad.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-[540px]">
        <DialogHeader className="space-y-3 border-b border-border bg-muted/20 px-6 py-5">
          <DialogTitle className="text-lg">Nueva actividad</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Planifica un seguimiento con{' '}
            <span className="font-medium text-foreground">{displayName}</span>.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary" className="font-normal">
              {isPurchase
                ? 'Orden de compra'
                : isCompany
                  ? 'Empresa'
                  : isOpportunity
                    ? 'Oportunidad'
                    : isQuote
                      ? 'Cotización'
                      : isInvoice
                        ? 'Factura'
                        : isProject
                          ? 'Proyecto'
                          : isSolicitud
                            ? 'Solicitud'
                            : isStockReceipt
                              ? 'Ingreso'
                              : isProduct
                                ? 'Producto'
                                : isInventory
                                  ? 'Inventario'
                                  : 'Contacto'}
            </Badge>
            <span className="text-sm text-muted-foreground">{displayName}</span>
            {isPurchase && companyName ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-sm text-muted-foreground">{companyName}</span>
              </>
            ) : null}
            {!isCompany &&
            !isPurchase &&
            !isOpportunity &&
            !isQuote &&
            !isInvoice &&
            !isProject &&
            !isSolicitud &&
            !isStockReceipt &&
            !isProduct &&
            !isInventory &&
            companyName ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-sm text-muted-foreground">{companyName}</span>
              </>
            ) : null}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[min(70vh,640px)] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tipo de interacción
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPE_OPTIONS.map(({ value, label }) => {
                  const Icon = typeIcons[value]
                  const selected = form.type === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patch({ type: value, title: defaultActivityTitle(value) })}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      <Icon aria-hidden className="size-3.5" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <ContactFormInput
                id="activity-title"
                label="Título"
                inputVariant="alphanumeric"
                value={form.title}
                onChange={(title) => patch({ title })}
              />
              <ContactFormField label="Descripción" id="activity-description">
                <textarea
                  id="activity-description"
                  rows={3}
                  value={form.description}
                  placeholder="Contexto, acuerdos o próximos pasos (opcional)…"
                  onChange={(e) => patch({ description: e.target.value })}
                  className={cn(
                    'w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none',
                    'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                />
              </ContactFormField>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <ContactFormDateTimeInput
                id="activity-datetime"
                label="Fecha y hora"
                value={form.scheduledAt}
                onChange={(scheduledAt) => patch({ scheduledAt })}
              />
              <UserLookupField
                label="Responsable"
                value={form.author}
                onChange={(author) => patch({ author })}
              />
              <ContactFormSelect
                id="activity-priority"
                label="Prioridad"
                value={form.priority}
                options={ACTIVITY_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
                onChange={(priority) =>
                  patch({ priority: priority as ActivityFormValues['priority'] })
                }
              />
              <ContactFormSelect
                id="activity-status"
                label="Estado inicial"
                value={form.status}
                options={ACTIVITY_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                onChange={(status) =>
                  patch({ status: status as ActivityFormValues['status'] })
                }
              />
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <ActivityReminderFields
                values={{
                  reminderPreset: form.reminderPreset,
                  reminderCustomAt: form.reminderCustomAt,
                }}
                onChange={(reminderPatch) => patch(reminderPatch)}
                selectId="contact-activity-reminder"
                customId="contact-activity-reminder-custom"
              />
            </section>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/10 px-6 py-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-border"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Guardando…' : 'Crear actividad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
