import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { CompanyLocationAddressFields } from '@/components/companies/CompanyLocationAddressFields'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  CompanyAddressRecord,
  CompanyBranchRecord,
} from '@/lib/company-location'
import {
  addressToLocationFields,
  branchToLocationFields,
  emptyLocationFieldValues,
  resolveLocationFieldsForSave,
  validateCompanyLocationFields,
  type CompanyLocationFieldValues,
} from '@/lib/company-location-form'
import {
  createCompanyLocationId,
} from '@/lib/company-locations-mutate'

export type LocationEntryKind = 'branch' | 'address'

type CompanyLocationEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: LocationEntryKind
  defaultCity: string
  initial?: CompanyBranchRecord | CompanyAddressRecord
  onSave: (entry: CompanyBranchRecord | CompanyAddressRecord) => void
}

export function CompanyLocationEntryDialog({
  open,
  onOpenChange,
  kind,
  defaultCity,
  initial,
  onSave,
}: CompanyLocationEntryDialogProps) {
  const isEdit = Boolean(initial)
  const [branchName, setBranchName] = useState('')
  const [addressLabel, setAddressLabel] = useState('')
  const [branchPhone, setBranchPhone] = useState('')
  const [location, setLocation] = useState<CompanyLocationFieldValues>(() =>
    emptyLocationFieldValues(defaultCity),
  )

  useEffect(() => {
    if (!open) return
    if (initial && kind === 'branch') {
      const branch = initial as CompanyBranchRecord
      setBranchName(branch.name)
      setBranchPhone(branch.phone ?? '')
      setLocation(branchToLocationFields(branch))
      return
    }
    if (initial && kind === 'address') {
      const address = initial as CompanyAddressRecord
      setAddressLabel(address.label)
      setBranchPhone('')
      setLocation(addressToLocationFields(address))
      return
    }
    setBranchName('')
    setAddressLabel('')
    setBranchPhone('')
    setLocation(emptyLocationFieldValues(defaultCity))
  }, [open, initial, kind, defaultCity])

  const title =
    kind === 'branch'
      ? isEdit
        ? 'Editar sucursal'
        : 'Agregar sucursal'
      : isEdit
        ? 'Editar dirección'
        : 'Agregar dirección'

  const handleSave = () => {
    if (kind === 'branch') {
      const name = branchName.trim()
      if (!name) {
        toast.warning('El nombre de la sucursal es obligatorio.')
        return
      }
      const locationError = validateCompanyLocationFields(location)
      if (locationError) {
        toast.warning(locationError)
        return
      }
      const resolved = resolveLocationFieldsForSave(location, defaultCity)
      const draft = initial as CompanyBranchRecord | undefined
      onSave({
        id: draft?.id || createCompanyLocationId('br'),
        name,
        ...resolved,
        phone: branchPhone.trim() || undefined,
      })
    } else {
      const label = addressLabel.trim()
      if (!label) {
        toast.warning('La etiqueta de la dirección es obligatoria.')
        return
      }
      const locationError = validateCompanyLocationFields(location)
      if (locationError) {
        toast.warning(locationError)
        return
      }
      const resolved = resolveLocationFieldsForSave(location, defaultCity)
      const draft = initial as CompanyAddressRecord | undefined
      onSave({
        id: draft?.id || createCompanyLocationId('addr'),
        label,
        ...resolved,
      })
    }
    onOpenChange(false)
  }

  const canSave =
    kind === 'branch' ? branchName.trim().length > 0 : addressLabel.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {kind === 'branch'
              ? 'Punto de atención o despacho adicional de la empresa.'
              : 'Dirección alternativa (facturación, despacho, bodega, etc.).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {kind === 'branch' ? (
            <ContactFormSection title="Datos de la sucursal">
              <ContactFormInput
                id="branch-name"
                label="Nombre"
                inputVariant="alphanumeric"
                value={branchName}
                onChange={setBranchName}
                placeholder="Ej. Sucursal norte"
              />
            </ContactFormSection>
          ) : (
            <ContactFormSection title="Datos de la dirección">
              <ContactFormInput
                id="addr-label"
                label="Etiqueta"
                inputVariant="alphanumeric"
                value={addressLabel}
                onChange={setAddressLabel}
                placeholder="Ej. Facturación, Bodega sur"
              />
            </ContactFormSection>
          )}

          <ContactFormSection title="Ubicación" icon={MapPin}>
            <CompanyLocationAddressFields
              idPrefix={kind === 'branch' ? 'branch' : 'addr'}
              streetLabel="Dirección"
              values={location}
              onChange={setLocation}
            />
          </ContactFormSection>

          {kind === 'branch' ? (
            <ContactFormSection title="Contacto">
              <ContactFormInput
                id="branch-phone"
                label="Teléfono"
                inputVariant="phone"
                value={branchPhone}
                onChange={setBranchPhone}
              />
            </ContactFormSection>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {isEdit ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
