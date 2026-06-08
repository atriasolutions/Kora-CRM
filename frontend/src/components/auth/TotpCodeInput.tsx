import { ContactFormInput } from '@/components/contacts/ContactFormField'

type TotpCodeInputProps = {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  /** Permite códigos de respaldo (8+ caracteres alfanuméricos) además del TOTP de 6 dígitos. */
  allowBackupCodes?: boolean
}

function normalizeTotpInput(raw: string, allowBackupCodes: boolean): string {
  const compact = raw.replace(/\s/g, '').toUpperCase()
  if (!allowBackupCodes) {
    return compact.replace(/\D/g, '').slice(0, 6)
  }
  // TOTP de 6 dígitos o código de respaldo tipo ABCD-1234 / ABCD1234
  const alnum = compact.replace(/[^A-Z0-9-]/g, '')
  if (alnum.length <= 6 && /^\d*$/.test(alnum.replace(/-/g, ''))) {
    return alnum.replace(/\D/g, '').slice(0, 6)
  }
  return alnum.replace(/-/g, '').slice(0, 16)
}

export function TotpCodeInput({
  id,
  label = 'Código de verificación',
  value,
  onChange,
  disabled,
  autoFocus,
  allowBackupCodes = false,
}: TotpCodeInputProps) {
  return (
    <ContactFormInput
      id={id}
      label={label}
      type="text"
      autoComplete="one-time-code"
      value={value}
      onChange={(v) => onChange(normalizeTotpInput(v, allowBackupCodes))}
      placeholder={allowBackupCodes ? '000000 o código de respaldo' : '000000'}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  )
}
