import {
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  ContactFormDateTimeInput,
  ContactFormField,
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
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { ACTIVITY_TYPE_OPTIONS } from '@/lib/contact-activity'
import {
  buildOutreachActivityDescription,
  CONTACT_OUTREACH_RESULT_OPTIONS,
  createDefaultOutreachFormValues,
  outreachActivityFromListItem,
  validateOutreachForm,
  type ContactOutreachFormValues,
} from '@/lib/contact-outreach'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { getCurrentUserName } from '@/lib/current-user'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const channelIcons: Record<ContactActivityType, LucideIcon> = {
  llamada: Phone,
  email: Mail,
  reunion: Calendar,
  nota: StickyNote,
  whatsapp: MessageCircle,
}

type LogContactOutreachDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactListItem | null
  presetChannel?: ContactActivityType
  onSaved?: (payload: {
    contact: ContactListItem
    activity: ContactActivity
  }) => void
}

export function LogContactOutreachDialog({
  open,
  onOpenChange,
  contact,
  presetChannel = 'llamada',
  onSaved,
}: LogContactOutreachDialogProps) {
  const { addActivity } = useActivitiesRegistry()
  const { logContactOutreach } = useContactsRegistry()
  const [form, setForm] = useState<ContactOutreachFormValues>(() =>
    createDefaultOutreachFormValues(presetChannel),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultOutreachFormValues(presetChannel))
      setSaving(false)
    })
  }, [open, presetChannel, contact?.id])

  if (!contact) return null

  const patch = (partial: Partial<ContactOutreachFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const validation = validateOutreachForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }

    setSaving(true)
    try {
      const author = getCurrentUserName()
      const { updatedContact, activityItem } = await logContactOutreach(
        contact,
        form,
        author,
        addActivity,
      )
      const activity = outreachActivityFromListItem(
        activityItem,
        buildOutreachActivityDescription(form.result, form.notes),
      )
      toast.success(`Intento registrado para «${updatedContact.name}».`)
      onSaved?.({ contact: updatedContact, activity })
      onOpenChange(false)
    } catch {
      toast.error('No se pudo registrar el intento de contacto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <DialogHeader className="space-y-3 border-b border-border bg-muted/20 px-6 py-5">
          <DialogTitle className="text-lg">Registrar intento de contacto</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Deja constancia de un intento ya realizado con{' '}
            <span className="font-medium text-foreground">{contact.name}</span>.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary" className="font-normal">
              {contact.status}
            </Badge>
            {contact.company ? (
              <span className="text-sm text-muted-foreground">{contact.company}</span>
            ) : null}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[min(70vh,640px)] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <ContactFormDateTimeInput
              id="outreach-datetime"
              label="Fecha y hora del contacto *"
              value={form.occurredAt}
              onChange={(occurredAt) => patch({ occurredAt })}
            />

            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Medio de contacto *
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPE_OPTIONS.map(({ value, label }) => {
                  const Icon = channelIcons[value]
                  const selected = form.channel === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patch({ channel: value })}
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

            <ContactFormSelect
              id="outreach-result"
              label="Resultado del intento *"
              value={form.result}
              onChange={(result) =>
                patch({ result: result as ContactOutreachFormValues['result'] })
              }
              options={CONTACT_OUTREACH_RESULT_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />

            <p className="-mt-2 text-xs text-muted-foreground">
              {
                CONTACT_OUTREACH_RESULT_OPTIONS.find((o) => o.value === form.result)
                  ?.description
              }
            </p>

            <ContactFormField label="Notas" id="outreach-notes">
              <textarea
                id="outreach-notes"
                rows={3}
                value={form.notes}
                placeholder="Contexto breve: acuerdos, objeciones, próximo paso…"
                onChange={(e) => patch({ notes: e.target.value })}
                className={cn(
                  'w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none',
                  'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
                )}
              />
            </ContactFormField>
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
