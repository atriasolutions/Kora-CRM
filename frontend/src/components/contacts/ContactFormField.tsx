import { useCallback, useState, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import {
  formatAmountCLPFromInput,
  formatIntegerFromInput,
  formatSignedIntegerFromInput,
  formatPercentFromInput,
  getEmailValidationError,
  getPhoneValidationError,
  sanitizeAlphanumeric,
  sanitizePhoneInput,
} from '@/lib/form-input-format'
import {
  purchaseDisplayDateToInput,
  purchaseInputDateToDisplay,
} from '@/lib/purchase-dates'
import { cn } from '@/lib/utils'

const fieldInputClass =
  'h-9 bg-background shadow-sm tabular-nums'

type FormControlBaseProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  required?: boolean
  /** Muestra el error de formato aunque el campo no haya perdido el foco. */
  forceShowError?: boolean
}

export type ContactFormInputVariant =
  | 'text'
  | 'alphanumeric'
  | 'amount'
  | 'percent'
  | 'integer'
  | 'signedInteger'
  | 'email'
  | 'phone'

export function ContactFormField({
  label,
  id,
  className,
  children,
}: {
  label: string
  id: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('w-full min-w-0 space-y-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Campo de texto; use `inputVariant` para monto, %, entero o alfanumérico. */
export function ContactFormInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  inputVariant = 'text',
  className,
  placeholder,
  disabled,
  autoFocus,
  required = false,
  forceShowError = false,
}: FormControlBaseProps & {
  type?: string
  inputVariant?: ContactFormInputVariant
}) {
  if (inputVariant === 'amount') {
    return (
      <ContactFormAmountInput
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder ?? '$0'}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    )
  }
  if (inputVariant === 'percent') {
    return (
      <ContactFormPercentInput
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder ?? '0'}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    )
  }
  if (inputVariant === 'integer' || inputVariant === 'signedInteger') {
    return (
      <ContactFormIntegerInput
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        signed={inputVariant === 'signedInteger'}
      />
    )
  }
  if (inputVariant === 'email') {
    return (
      <ContactFormEmailInput
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        required={required}
        forceShowError={forceShowError}
      />
    )
  }
  if (inputVariant === 'phone') {
    return (
      <ContactFormPhoneInput
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        required={required}
        forceShowError={forceShowError}
      />
    )
  }
  if (inputVariant === 'alphanumeric') {
    return (
      <ContactFormAlphanumericInput
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    )
  }

  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type={type === 'number' ? 'text' : type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={fieldInputClass}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </ContactFormField>
  )
}

function ValidatedFieldShell({
  id,
  label,
  required,
  className,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  className?: string
  error: string | null
  children: ReactNode
}) {
  const displayLabel = required && !label.includes('*') ? `${label} *` : label
  return (
    <ContactFormField label={displayLabel} id={id} className={className}>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </ContactFormField>
  )
}

/** Email con validación de formato al perder foco o al enviar. */
export function ContactFormEmailInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  className,
  placeholder = 'nombre@empresa.com',
  disabled,
  autoFocus,
  required = false,
  forceShowError = false,
}: FormControlBaseProps) {
  const [touched, setTouched] = useState(false)
  const showError = touched || forceShowError
  const error = showError ? getEmailValidationError(value, { required }) : null

  return (
    <ValidatedFieldShell
      id={id}
      label={label}
      required={required}
      className={className}
      error={error}
    >
      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-9 bg-background shadow-sm',
          error && 'border-destructive focus-visible:ring-destructive/30',
        )}
        onChange={(e) => onChange(e.target.value.trimStart())}
        onBlur={() => {
          setTouched(true)
          onChange(value.trim())
          onBlur?.()
        }}
      />
    </ValidatedFieldShell>
  )
}

/** Teléfono con validación de formato (8–15 dígitos). */
export function ContactFormPhoneInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  className,
  placeholder = '+56 9 8765 4321',
  disabled,
  autoFocus,
  required = false,
  forceShowError = false,
}: FormControlBaseProps) {
  const [touched, setTouched] = useState(false)
  const showError = touched || forceShowError
  const error = showError ? getPhoneValidationError(value, { required }) : null

  return (
    <ValidatedFieldShell
      id={id}
      label={label}
      required={required}
      className={className}
      error={error}
    >
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-9 bg-background shadow-sm',
          error && 'border-destructive focus-visible:ring-destructive/30',
        )}
        onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}
        onBlur={() => {
          setTouched(true)
          onBlur?.()
        }}
      />
    </ValidatedFieldShell>
  )
}

/** Monto en CLP: solo dígitos, formato $XX.XXX.XXX */
export function ContactFormAmountInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  className,
  placeholder = '$0',
  disabled,
  autoFocus,
}: FormControlBaseProps) {
  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={fieldInputClass}
        onChange={(e) => onChange(formatAmountCLPFromInput(e.target.value))}
        onBlur={onBlur}
      />
    </ContactFormField>
  )
}

/** Porcentaje 0–100; el % es adornment visual (no forma parte del texto editable). */
export function ContactFormPercentInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  className,
  placeholder = '0',
  disabled,
  autoFocus,
}: FormControlBaseProps) {
  const displayValue = value.replace(/[^\d]/g, '')
  return (
    <ContactFormField label={label} id={id} className={className}>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          placeholder={placeholder.replace(/%/g, '') || '0'}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(fieldInputClass, 'pr-8')}
          onChange={(e) => onChange(formatPercentFromInput(e.target.value))}
          onBlur={onBlur}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
        >
          %
        </span>
      </div>
    </ContactFormField>
  )
}

/** Entero positivo (cantidades, empleados, etc.) o con signo si `signed`. */
export function ContactFormIntegerInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  className,
  placeholder,
  disabled,
  autoFocus,
  signed = false,
}: FormControlBaseProps & { signed?: boolean }) {
  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type="text"
        inputMode={signed ? 'text' : 'numeric'}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={fieldInputClass}
        onChange={(e) =>
          onChange(
            signed
              ? formatSignedIntegerFromInput(e.target.value)
              : formatIntegerFromInput(e.target.value),
          )
        }
        onBlur={onBlur}
      />
    </ContactFormField>
  )
}

/** Texto libre con tildes y puntuación en español; respeta composición IME. */
export function ContactFormAlphanumericInput({
  id,
  label,
  value,
  onChange,
  onBlur: onBlurProp,
  className,
  placeholder,
  disabled,
  autoFocus,
}: FormControlBaseProps) {
  const [isComposing, setIsComposing] = useState(false)

  const applySanitized = useCallback(
    (raw: string) => onChange(sanitizeAlphanumeric(raw)),
    [onChange],
  )

  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type="text"
        inputMode="text"
        lang="es"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={fieldInputClass}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={(e) => {
          setIsComposing(false)
          applySanitized(e.currentTarget.value)
        }}
        onChange={(e) => {
          if (isComposing) {
            onChange(e.target.value)
            return
          }
          applySanitized(e.target.value)
        }}
        onBlur={(e) => {
          if (isComposing) {
            applySanitized(e.currentTarget.value)
            setIsComposing(false)
          }
          onBlurProp?.()
        }}
      />
    </ContactFormField>
  )
}

export function ContactFormCheckbox({
  id,
  label,
  checked,
  onChange,
  description,
  className,
  disabled,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-input"
      />
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium leading-none text-foreground">
          {label}
        </label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Fecha y hora con `<input type="datetime-local" />` (valor ISO local yyyy-MM-ddTHH:mm). */
export function ContactFormDateTimeInput({
  id,
  label,
  value,
  onChange,
  className,
  disabled,
  min,
  max,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  min?: string
  max?: string
}) {
  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type="datetime-local"
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        className={fieldInputClass}
        onChange={(e) => onChange(e.target.value)}
      />
    </ContactFormField>
  )
}

export function ContactFormTextarea({
  id,
  label,
  value,
  onChange,
  className,
  placeholder,
  rows = 3,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
}) {
  return (
    <ContactFormField label={label} id={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none',
          'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
    </ContactFormField>
  )
}

/** Fecha con `<input type="date" />`; el valor externo usa formato es-CL (ej. «30 jun 2024»). */
export function ContactFormDateInput({
  id,
  label,
  value,
  onChange,
  className,
  disabled,
  min,
  max,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  min?: string
  max?: string
}) {
  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type="date"
        value={purchaseDisplayDateToInput(value)}
        disabled={disabled}
        min={min}
        max={max}
        className="h-9 bg-background shadow-sm"
        onChange={(e) => onChange(purchaseInputDateToDisplay(e.target.value))}
      />
    </ContactFormField>
  )
}

/** Picklist / lista de selección */
export function ContactFormSelect({
  id,
  label,
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
  disabled?: boolean
}) {
  return (
    <ContactFormField label={label} id={id} className={className}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </ContactFormField>
  )
}
