import { TaxIdentifierFields } from '@/components/shared/TaxIdentifierFields'
import {
  COMPANY_TAX_IDENTIFIER_TYPE_OPTIONS,
  type TaxIdentifierType,
} from '@/lib/tax-identifier'

type CompanyTaxIdentifierFieldsProps = {
  idPrefix?: string
  identifierType: TaxIdentifierType
  value: string
  onIdentifierTypeChange: (type: TaxIdentifierType) => void
  onValueChange: (value: string) => void
  forceShowError?: boolean
}

export function CompanyTaxIdentifierFields(props: CompanyTaxIdentifierFieldsProps) {
  return (
    <TaxIdentifierFields
      {...props}
      rutRange="company"
      typeOptions={COMPANY_TAX_IDENTIFIER_TYPE_OPTIONS}
      entityName="company"
    />
  )
}
