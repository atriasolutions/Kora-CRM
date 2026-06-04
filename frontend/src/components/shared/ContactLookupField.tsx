import { ChevronDown, Plus, Search, UserRound, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { CreateContactDialog } from '@/components/contacts/CreateContactDialog'
import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { listContactsForCompanyApi } from '@/api/contacts'
import type { ContactListItem } from '@/data/contacts.mock'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { findCompanyById } from '@/lib/company-lookup'
import {
  contactBelongsToCompany,
  contactListItemFromPreset,
  findLinkedContact,
  mergeContactLookupPool,
  searchContacts,
  type ContactLookupPreset,
} from '@/lib/contact-lookup'
import { shouldClearContactOnCompanyChange } from '@/lib/dependent-lookup'
import { createDefaultContactFormValues } from '@/lib/contact-create'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

type ContactLookupFieldProps = {
  label?: string
  value: string
  onChange: (contactId: string, contact?: ContactListItem) => void
  /** Si está definido, solo muestra contactos de esa empresa. */
  companyId?: string
  /** Nombre de empresa para filtrar contactos sin id vinculado. */
  companyName?: string
  /** Respaldo si el id de la ficha no coincide con el catálogo (p. ej. contactos-0). */
  contactName?: string
  /** Contacto vinculado aunque no esté aún en el registry (p. ej. ficha de oportunidad). */
  presetContact?: ContactLookupPreset
  disabled?: boolean
  className?: string
}

export function ContactLookupField({
  label = 'Contacto principal',
  value: contactId,
  onChange,
  companyId,
  companyName,
  contactName,
  presetContact,
  disabled = false,
  className,
}: ContactLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-contact-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-contact-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allContacts, addContact, reloadFromApi } = useContactsRegistry()
  const { allCompanies } = useCompaniesRegistry()
  const { can } = useMenuAccess()
  const canCreateContact = can('contactos', 'create')
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [blockAutofill, setBlockAutofill] = useState(true)
  const [companyScopedContacts, setCompanyScopedContacts] = useState<
    ContactListItem[]
  >([])

  const companyFilter = companyId?.trim() || undefined
  const isCompanyDependent = companyId !== undefined

  const linkedCompany = companyFilter
    ? findCompanyById(allCompanies, companyFilter)
    : undefined

  const resolvedCompanyName =
    companyName?.trim() || linkedCompany?.name || undefined

  const lookupPool = useMemo(
    () =>
      mergeContactLookupPool(
        [...allContacts, ...companyScopedContacts],
        presetContact,
      ),
    [allContacts, companyScopedContacts, presetContact],
  )

  const selected = useMemo(() => {
    const linked = findLinkedContact(lookupPool, {
      id: contactId,
      name: contactName,
      email: presetContact?.email,
      companyId,
      company: resolvedCompanyName ?? presetContact?.company,
    })
    if (linked) {
      if (
        companyFilter &&
        !contactBelongsToCompany(
          linked,
          companyFilter,
          resolvedCompanyName,
          allCompanies,
        )
      ) {
        return undefined
      }
      return linked
    }

    const preset =
      presetContact &&
      (presetContact.name.trim() ||
        presetContact.id.trim() ||
        presetContact.email?.trim())
        ? presetContact
        : undefined
    if (!preset) return undefined

    const displayName =
      contactName?.trim() ||
      preset.name?.trim() ||
      preset.email?.split('@')[0]?.trim() ||
      'Contacto vinculado'

    const fallback = contactListItemFromPreset({
      ...preset,
      id: contactId.trim() || preset.id,
      name: displayName,
      companyId: preset.companyId ?? companyId,
      company: preset.company ?? resolvedCompanyName ?? '',
    })
    if (
      companyFilter &&
      !contactBelongsToCompany(
        fallback,
        companyFilter,
        resolvedCompanyName,
        allCompanies,
      )
    ) {
      return undefined
    }
    return fallback
  }, [
    allCompanies,
    companyFilter,
    companyId,
    contactId,
    contactName,
    lookupPool,
    presetContact,
    resolvedCompanyName,
  ])

  const companyContactPool = useMemo(() => {
    if (!companyFilter) return lookupPool
    return lookupPool.filter((contact) =>
      contactBelongsToCompany(
        contact,
        companyFilter,
        resolvedCompanyName,
        allCompanies,
      ),
    )
  }, [allCompanies, companyFilter, lookupPool, resolvedCompanyName])

  const results = useMemo(() => {
    if (!companyFilter) {
      return searchContacts(allContacts, query, { limit: 10 })
    }
    return searchContacts(companyContactPool, query, { limit: 10 })
  }, [allContacts, companyContactPool, companyFilter, query])

  useEffect(() => {
    if (!companyFilter) {
      setCompanyScopedContacts([])
      return
    }
    let cancelled = false
    void listContactsForCompanyApi(companyFilter)
      .then((rows) => {
        if (!cancelled) setCompanyScopedContacts(rows)
      })
      .catch(() => {
        if (!cancelled) setCompanyScopedContacts([])
      })
    return () => {
      cancelled = true
    }
  }, [companyFilter])

  const showCreateOption =
    canCreateContact &&
    query.trim().length > 0 &&
    !results.some((c) => c.name.toLowerCase() === query.trim().toLowerCase())

  const companyScopeKey = `${companyFilter ?? ''}\0${resolvedCompanyName ?? ''}`
  const prevCompanyScopeRef = useRef(companyScopeKey)

  useEffect(() => {
    if (!open) return
    void reloadFromApi().catch(() => {})
  }, [open, reloadFromApi])

  useEffect(() => {
    if (!isCompanyDependent) return
    if (prevCompanyScopeRef.current === companyScopeKey) return
    prevCompanyScopeRef.current = companyScopeKey

    if (
      shouldClearContactOnCompanyChange(
        companyFilter ?? '',
        contactId,
        allContacts,
        resolvedCompanyName,
        allCompanies,
      )
    ) {
      onChange('')
      setOpen(false)
      setQuery('')
    }
  }, [
    allContacts,
    companyFilter,
    companyScopeKey,
    contactId,
    isCompanyDependent,
    onChange,
    resolvedCompanyName,
  ])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selectContact = (contact: ContactListItem) => {
    onChange(contact.id, contact)
    setQuery('')
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setBlockAutofill(true)
    setOpen(true)
  }

  const showSearchInput = !selected || open

  useEffect(() => {
    if (showSearchInput) setBlockAutofill(true)
  }, [showSearchInput])

  return (
    <>
      <ContactFormField label={label} id={inputId} className={className}>
        <div ref={containerRef} className="relative">
          <input
            type="text"
            tabIndex={-1}
            aria-hidden
            autoComplete="off"
            className="pointer-events-none absolute size-0 opacity-0"
            defaultValue=""
          />
          {selected && !open ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm',
                disabled && 'opacity-60',
              )}
            >
              <Avatar className="size-8 shrink-0 border border-border">
                <AvatarImage src={selected.avatarUrl} alt="" />
                <AvatarFallback className="text-xs">
                  {initials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {selected.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.role} · {selected.company}
                </p>
              </div>
              {!disabled ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Cambiar contacto"
                    onClick={() => {
                      setQuery(selected.name)
                      setBlockAutofill(true)
                      setOpen(true)
                    }}
                  >
                    <ChevronDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label="Quitar contacto"
                    onClick={clearSelection}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={inputId}
                name={inputName}
                type="search"
                value={query}
                disabled={disabled}
                readOnly={blockAutofill && !disabled}
                placeholder={
                  companyFilter && linkedCompany
                    ? `Buscar contacto en ${linkedCompany.name}…`
                    : 'Buscar contacto existente…'
                }
                className="h-9 bg-background ps-8 shadow-sm"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                data-form-type="other"
                role="combobox"
                aria-expanded={open}
                aria-controls={`${inputId}-listbox`}
                aria-autocomplete="list"
                onFocus={() => {
                  setBlockAutofill(false)
                  setOpen(true)
                }}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setOpen(true)
                }}
              />
            </div>
          )}

          {open && !disabled ? (
            <ul
              id={`${inputId}-listbox`}
              role="listbox"
              className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
            >
              {companyFilter && results.length === 0 && !showCreateOption ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Sin contactos en esta empresa. Crea uno nuevo.
                </li>
              ) : null}
              {results.length === 0 && !showCreateOption && !companyFilter ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Sin resultados
                </li>
              ) : null}
              {results.map((contact) => (
                <li key={contact.id} role="option">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted',
                      contact.id === contactId && 'bg-muted/80',
                    )}
                    onClick={() => selectContact(contact)}
                  >
                    <UserRound
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{contact.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {contact.company} · {contact.email}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {showCreateOption ? (
                <li className="border-t border-border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm text-primary hover:bg-muted"
                    onClick={() => {
                      setCreateOpen(true)
                      setOpen(false)
                    }}
                  >
                    <Plus aria-hidden className="size-4 shrink-0" />
                    <span>
                      Crear contacto «<strong className="font-semibold">{query.trim()}</strong>»
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        {selected && !disabled ? (
          <p className="text-xs text-muted-foreground">
            Vinculado al registro{' '}
            <Link
              to={`/contactos/${selected.id}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {selected.name}
            </Link>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Busca un contacto existente o crea un registro nuevo.
            {companyFilter && linkedCompany
              ? ` Filtrado por ${linkedCompany.name}.`
              : ''}
          </p>
        )}
      </ContactFormField>

      {canCreateContact ? (
        <CreateContactDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Nuevo contacto"
          description={
            linkedCompany
              ? `Se vinculará a ${linkedCompany.name} y a esta oportunidad.`
              : 'Se vinculará automáticamente a esta oportunidad.'
          }
          initialValues={createDefaultContactFormValues({
            name: query.trim(),
            companyId: companyFilter ?? '',
            company: linkedCompany?.name ?? '',
          })}
          onSubmit={async (values) => {
            const created = await addContact(values)
            onChange(created.id, created)
            setQuery('')
          }}
        />
      ) : null}
    </>
  )
}
