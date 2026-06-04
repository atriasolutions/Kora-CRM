import { ContactFormInput } from '@/components/contacts/ContactFormField'

type TotpCodeInputProps = {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function TotpCodeInput({
  id,
  label = 'Código de verificación',
  value,
  onChange,
  disabled,
  autoFocus,
}: TotpCodeInputProps) {
  return (
    <ContactFormInput
      id={id}
      label={label}
      type="text"
      autoComplete="one-time-code"
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      disabled={disabled}
      autoFocus={autoFocus}
    />
  )
}
