import { useEffect, useMemo, useState } from 'react'

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

function BankAccountPreview({ account }: { account: BankAccount }) {
  return (
    <div className="rounded-md border border-border/80 bg-background/80 p-3 text-sm">
      <p className="font-medium text-foreground">{account.accountName}</p>
      {account.rut?.trim() ? (
        <p className="tabular-nums text-muted-foreground">RUT {account.rut}</p>
      ) : null}
      <p className="text-muted-foreground">
        {account.bankName} · {account.accountType}
      </p>
      <p className="tabular-nums text-foreground">{account.accountNumber}</p>
      {account.email?.trim() ? (
        <p className="text-xs text-muted-foreground">{account.email}</p>
      ) : null}
    </div>
  )
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
  const selectedId = values.bankAccountId || defaultId

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedId),
    [accounts, selectedId],
  )

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
        <>
          <ContactFormSelect
            id={`${idPrefix}-account`}
            label="Cuenta bancaria"
            value={selectedId}
            onChange={(bankAccountId) => onChange({ bankAccountId })}
            options={options}
          />
          {selectedAccount ? <BankAccountPreview account={selectedAccount} /> : null}
        </>
      ) : null}
    </div>
  )
}
