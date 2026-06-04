import { useState } from 'react'

import {
  ContactFormField,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ContactRutInput } from '@/components/contacts/ContactRutInput'
import { Input } from '@/components/ui/input'
import type { RutRange } from '@/lib/contact-rut'
import {
  getDniValidationMessage,
  type TaxIdentifierType,
} from '@/lib/tax-identifier'
import { cn } from '@/lib/utils'

type TaxIdentifierFieldsProps = {
  idPrefix?: string
  identifierType: TaxIdentifierType
  value: string
  onIdentifierTypeChange: (type: TaxIdentifierType) => void
  onValueChange: (value: string) => void
  forceShowError?: boolean
  rutRange: RutRange
  typeOptions: { value: TaxIdentifierType; label: string }[]
  entityName?: 'contact' | 'company'
}

export function TaxIdentifierFields({
  idPrefix = 'entity',
  identifierType,
  value,
  onIdentifierTypeChange,
  onValueChange,
  forceShowError = false,
  rutRange,
  typeOptions,
  entityName = 'company',
}: TaxIdentifierFieldsProps) {
  const [dniTouched, setDniTouched] = useState(false)
  const isRut = identifierType === 'RUT'
  const dniError =
    !isRut && (dniTouched || forceShowError)
      ? getDniValidationMessage(value)
      : null

  const handleTypeChange = (nextRaw: string) => {
    const next = nextRaw as TaxIdentifierType
    if (next === identifierType) return
    onIdentifierTypeChange(next)
    onValueChange('')
    setDniTouched(false)
  }

  const rutPlaceholder = rutRange === 'company' ? '76.123.456-7' : '12.345.678-9'

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ContactFormSelect
        id={`${idPrefix}-identifier-type`}
        label="Tipo de identificador *"
        value={identifierType}
        onChange={handleTypeChange}
        options={typeOptions.map((o) => ({ value: o.value, label: o.label }))}
      />
      {isRut ? (
        <ContactRutInput
          id={`${idPrefix}-rut`}
          label="RUT"
          value={value}
          onChange={onValueChange}
          forceShowError={forceShowError}
          range={rutRange}
          placeholder={rutPlaceholder}
        />
      ) : (
        <ContactFormField label="DNI *" id={`${idPrefix}-dni`}>
          <Input
            id={`${idPrefix}-dni`}
            type="text"
            autoComplete="off"
            name={`crm-${entityName}-dni-${idPrefix}`}
            value={value}
            placeholder="Ej. AB123456"
            aria-invalid={dniError ? true : undefined}
            aria-describedby={dniError ? `${idPrefix}-dni-error` : undefined}
            className={cn(
              'h-9 bg-background shadow-sm',
              dniError && 'border-destructive focus-visible:ring-destructive/30',
            )}
            onChange={(e) => onValueChange(e.target.value.toUpperCase())}
            onBlur={() => {
              setDniTouched(true)
              if (value.trim()) onValueChange(value.trim().toUpperCase())
            }}
          />
          {dniError ? (
            <p id={`${idPrefix}-dni-error`} className="text-xs text-destructive" role="alert">
              {dniError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Documento de identidad para personas extranjeras sin RUT chileno.
            </p>
          )}
        </ContactFormField>
      )}
    </div>
  )
}
