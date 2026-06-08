import { ContactFormInput } from '@/components/contacts/ContactFormField'

type DocumentGlobalDiscountFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function DocumentGlobalDiscountField({
  id,
  value,
  onChange,
  disabled = false,
}: DocumentGlobalDiscountFieldProps) {
  return (
    <ContactFormInput
      id={id}
      label="Descuento global"
      inputVariant="percent"
      value={value}
      disabled={disabled}
      onChange={onChange}
    />
  )
}
