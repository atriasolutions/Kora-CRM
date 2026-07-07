import { Landmark, Plus, Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  createBankAccountApi,
  deleteBankAccountApi,
  listBankAccountsApi,
  updateBankAccountApi,
  type BankAccount,
  type BankAccountInput,
} from '@/api/bank-accounts'
import { isApiEnabled } from '@/api/config'
import { ContactFormInput, ContactFormSelect } from '@/components/contacts/ContactFormField'
import { ContactRutInput } from '@/components/contacts/ContactRutInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { CHILE_ACCOUNT_TYPES, CHILE_BANKS, normalizeChileBankCode } from '@/lib/chile-banks'
import { getRutValidationMessage } from '@/lib/contact-rut'
import { cn } from '@/lib/utils'

const emptyDraft = (): BankAccountInput => ({
  accountName: '',
  bankCode: CHILE_BANKS[0]?.code ?? '1',
  accountType: CHILE_ACCOUNT_TYPES[0],
  accountNumber: '',
  rut: '',
  email: '',
})

function isBankDraftValid(values: BankAccountInput): boolean {
  return (
    values.accountName.trim().length > 0 &&
    values.accountNumber.trim().length > 0 &&
    getRutValidationMessage(values.rut, { required: true }) === null
  )
}

export function BankAccountsSettingsPanel() {
  const { canCreate, canEdit, canDelete } = useModulePermissions('configuracion')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<BankAccountInput>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<BankAccountInput>(emptyDraft)
  const [createAttempted, setCreateAttempted] = useState(false)
  const [editAttemptedId, setEditAttemptedId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!isApiEnabled()) {
      setAccounts([])
      return
    }
    setLoading(true)
    try {
      setAccounts(await listBankAccountsApi())
    } catch (err) {
      toast.warning(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const run = async (fn: () => Promise<void>, success?: string) => {
    try {
      await fn()
      if (success) toast.success(success)
      await reload()
    } catch (err) {
      toast.warning(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  const handleCreate = () => {
    setCreateAttempted(true)
    if (!isBankDraftValid(draft)) return
    void run(async () => {
      await createBankAccountApi(draft)
      setDraft(emptyDraft())
      setCreateAttempted(false)
    }, 'Cuenta bancaria creada.')
  }

  const startEdit = (account: BankAccount) => {
    setEditingId(account.id)
    setEditAttemptedId(null)
    setEditDraft({
      accountName: account.accountName,
      bankCode: normalizeChileBankCode(account.bankCode),
      accountType: account.accountType,
      accountNumber: account.accountNumber,
      rut: account.rut,
      email: account.email,
      isDefault: account.isDefault,
    })
  }

  const handleUpdate = (id: string) => {
    setEditAttemptedId(id)
    if (!isBankDraftValid(editDraft)) return
    void run(async () => {
      await updateBankAccountApi(id, editDraft)
      setEditingId(null)
      setEditAttemptedId(null)
    }, 'Cuenta actualizada.')
  }

  const handleSetDefault = (id: string) =>
    run(async () => {
      await updateBankAccountApi(id, { isDefault: true })
    }, 'Cuenta predeterminada actualizada.')

  const handleDelete = (id: string) =>
    run(async () => {
      await deleteBankAccountApi(id)
      if (editingId === id) setEditingId(null)
    }, 'Cuenta eliminada.')

  const bankOptions = CHILE_BANKS.map((b) => ({ value: b.code, label: b.name }))
  const accountTypeOptions = CHILE_ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))

  const renderForm = (
    values: BankAccountInput,
    onChange: (patch: Partial<BankAccountInput>) => void,
    idPrefix: string,
    forceRutError = false,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <ContactFormInput
        id={`${idPrefix}-name`}
        label="Nombre de la cuenta"
        value={values.accountName}
        onChange={(accountName) => onChange({ accountName })}
      />
      <ContactRutInput
        id={`${idPrefix}-rut`}
        label="RUT"
        value={values.rut}
        onChange={(rut) => onChange({ rut })}
        forceShowError={forceRutError}
      />
      <ContactFormSelect
        id={`${idPrefix}-bank`}
        label="Banco"
        value={values.bankCode}
        onChange={(bankCode) => onChange({ bankCode })}
        options={bankOptions}
      />
      <ContactFormSelect
        id={`${idPrefix}-type`}
        label="Tipo de cuenta"
        value={values.accountType}
        onChange={(accountType) => onChange({ accountType })}
        options={accountTypeOptions}
      />
      <ContactFormInput
        id={`${idPrefix}-number`}
        label="Número de cuenta"
        value={values.accountNumber}
        onChange={(accountNumber) => onChange({ accountNumber })}
      />
      <ContactFormInput
        id={`${idPrefix}-email`}
        label="Correo (opcional)"
        value={values.email ?? ''}
        onChange={(email) => onChange({ email })}
      />
    </div>
  )

  if (!isApiEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos bancarios</CardTitle>
          <CardDescription>
            Disponible con la API activa. Configura cuentas para incluirlas en PDF de cotizaciones.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark aria-hidden className="size-4" />
            Cuentas bancarias
          </CardTitle>
          <CardDescription>
            Registra las cuentas de la empresa para transferencias. Puedes elegir una al generar el
            PDF de una cotización.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando cuentas…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay cuentas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className={cn(
                    'rounded-lg border border-border p-4',
                    account.isDefault && 'border-primary/40 bg-primary/5',
                  )}
                >
                  {editingId === account.id ? (
                    <div className="space-y-3">
                      {renderForm(
                        editDraft,
                        (p) => setEditDraft((d) => ({ ...d, ...p })),
                        `edit-${account.id}`,
                        editAttemptedId === account.id,
                      )}
                      <div className="flex flex-wrap gap-2">
                        {canEdit ? (
                          <Button type="button" size="sm" onClick={() => handleUpdate(account.id)}>
                            Guardar
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {account.accountName}
                            {account.isDefault ? (
                              <span className="ml-2 text-xs font-normal text-primary">
                                Predeterminada
                              </span>
                            ) : null}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {account.bankName} · {account.accountType}
                          </p>
                          {account.rut?.trim() ? (
                            <p className="text-sm tabular-nums text-foreground">RUT {account.rut}</p>
                          ) : null}
                          <p className="text-sm tabular-nums text-foreground">
                            {account.accountNumber}
                          </p>
                          {account.email?.trim() ? (
                            <p className="text-xs text-muted-foreground">{account.email}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {canEdit && !account.isDefault ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Marcar predeterminada"
                              onClick={() => handleSetDefault(account.id)}
                            >
                              <Star aria-hidden className="size-4" />
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(account)}
                            >
                              Editar
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDelete(account.id)}
                            >
                              <Trash2 aria-hidden className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderForm(draft, (p) => setDraft((d) => ({ ...d, ...p })), 'new', createAttempted)}
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!isBankDraftValid(draft)}
            >
              <Plus aria-hidden className="size-4" />
              Agregar cuenta
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
