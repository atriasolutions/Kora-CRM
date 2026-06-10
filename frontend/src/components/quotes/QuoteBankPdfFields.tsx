import { useEffect, useState } from 'react'

import { listBankAccountsApi, type BankAccount } from '@/api/bank-accounts'
import { isApiEnabled } from '@/api/config'
import {
  ContactFormCheckbox,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'

export type QuoteBankPdfValues = {
  includeBankDetails: boolean
  bankAccountId: string
}

type QuoteBankPdfFieldsProps = {
  values: QuoteBankPdfValues
  onChange: (patch: Partial<QuoteBankPdfValues>) => void
  idPrefix?: string
}

export function QuoteBankPdfFields({
  values,
  onChange,
  idPrefix = 'quote-bank',
}: QuoteBankPdfFieldsProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([])

  useEffect(() => {
    if (!isApiEnabled()) return
    void listBankAccountsApi()
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [])

  const options = accounts.map((a) => ({
    value: a.id,
    label: `${a.accountName} — ${a.bankName}`,
  }))

  const defaultId = accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? ''

  useEffect(() => {
    if (!values.includeBankDetails || values.bankAccountId || !defaultId) return
    onChange({ bankAccountId: defaultId })
  }, [defaultId, onChange, values.bankAccountId, values.includeBankDetails])

  if (!isApiEnabled() || accounts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border/80 bg-muted/10 p-4">
      <p className="text-sm font-semibold text-foreground">Datos bancarios en PDF</p>
      <ContactFormCheckbox
        id={`${idPrefix}-include`}
        label="Incluir datos bancarios en el PDF"
        checked={values.includeBankDetails}
        onChange={(includeBankDetails) => onChange({ includeBankDetails })}
      />
      {values.includeBankDetails ? (
        <ContactFormSelect
          id={`${idPrefix}-account`}
          label="Cuenta bancaria"
          value={values.bankAccountId || defaultId}
          onChange={(bankAccountId) => onChange({ bankAccountId })}
          options={options}
        />
      ) : null}
    </div>
  )
}
