import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Input } from '@/components/ui/input'
import type { ProductCurrency } from '@/lib/currency'
import {
  formatProductPriceFromInput,
  normalizeProductPriceOnBlur,
  productPricePlaceholder,
  productPriceUsesDecimals,
} from '@/lib/product-currency-input'
import { cn } from '@/lib/utils'

const fieldInputClass =
  'h-9 border-border bg-background text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring'

type ProductPriceInputProps = {
  id: string
  label: string
  currency: ProductCurrency
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export function ProductPriceInput({
  id,
  label,
  currency,
  value,
  onChange,
  className,
  disabled,
}: ProductPriceInputProps) {
  const decimal = productPriceUsesDecimals(currency)

  return (
    <ContactFormField label={label} id={id} className={className}>
      <Input
        id={id}
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        placeholder={productPricePlaceholder(currency)}
        disabled={disabled}
        className={cn(fieldInputClass)}
        onChange={(e) => onChange(formatProductPriceFromInput(e.target.value, currency))}
        onBlur={() => onChange(normalizeProductPriceOnBlur(value, currency))}
      />
    </ContactFormField>
  )
}
