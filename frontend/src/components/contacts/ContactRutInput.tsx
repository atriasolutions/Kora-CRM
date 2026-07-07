import { useState } from 'react'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Input } from '@/components/ui/input'
import {
  formatRutOnBlur,
  getRutValidationMessage,
  sanitizeRutTyping,
  type RutRange,
} from '@/lib/contact-rut'
import { cn } from '@/lib/utils'

type ContactRutInputProps = {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  /** Muestra el error aunque el campo no haya perdido el foco (p. ej. al enviar). */
  forceShowError?: boolean
  className?: string
  placeholder?: string
  /** Por defecto valida RUT de persona (< 50.000.000). Omitir para aceptar cualquier RUT válido. */
  range?: RutRange
}

export function ContactRutInput({
  id,
  label = 'RUT',
  value,
  onChange,
  required = true,
  forceShowError = false,
  className,
  placeholder = '12.345.678-9',
  range,
}: ContactRutInputProps) {
  const [touched, setTouched] = useState(false)
  const showError = touched || forceShowError
  const error = showError ? getRutValidationMessage(value, { required, range }) : null

  const helpText =
    range === 'company'
      ? 'Formato chileno · dígito verificador · empresas (50.000.000 o superior).'
      : range === 'person'
        ? 'Formato chileno · dígito verificador · personas naturales (inferior a 50.000.000).'
        : 'Formato chileno con dígito verificador.'

  return (
    <ContactFormField label={required ? `${label} *` : label} id={id} className={className}>
      <Input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        name={`crm-contact-rut-${id}`}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-9 bg-background shadow-sm',
          error && 'border-destructive focus-visible:ring-destructive/30',
        )}
        onChange={(e) => onChange(sanitizeRutTyping(e.target.value))}
        onBlur={() => {
          setTouched(true)
          if (value.trim()) onChange(formatRutOnBlur(value))
        }}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </ContactFormField>
  )
}
