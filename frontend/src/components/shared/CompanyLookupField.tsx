import { Building2, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog'
import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CompanyListItem } from '@/data/companies.mock'
import type { CreateCompanyFormValues } from '@/lib/company-create'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { createDefaultCompanyFormValues } from '@/lib/company-create'
import {
  companyListItemFromPreset,
  findCompanyById,
  findCompanyByName,
  mergeCompanyLookupPool,
  searchCompanies,
  type CompanyLookupPreset,
} from '@/lib/company-lookup'
import { cn } from '@/lib/utils'

type CompanyLookupFieldProps = {
  /** @deprecated Ignorado a propósito: ids como "contact-company" activan autofill de Chrome. */
  id?: string
  label?: string
  value: string
  onChange: (companyId: string, company?: CompanyListItem) => void
  disabled?: boolean
  className?: string
  /** Restringe empresas visibles en búsqueda (la selección actual siempre se muestra). */
  filterCompany?: (company: CompanyListItem) => boolean
  createInitialValues?: Partial<CreateCompanyFormValues>
  searchPlaceholder?: string
  helperText?: string
  /** Empresa preseleccionada aunque aún no esté en el catálogo del registry (p. ej. ficha abierta). */
  presetCompany?: CompanyLookupPreset
}

export function CompanyLookupField({
  label = 'Empresa',
  value: companyId,
  onChange,
  disabled = false,
  className,
  filterCompany,
  createInitialValues,
  searchPlaceholder = 'Buscar empresa existente…',
  helperText,
  presetCompany,
}: CompanyLookupFieldProps) {
  const generatedId = useId()
  /** Id interno: evita ids tipo "contact-company" que Chrome asocia a autocompletado. */
  const inputId = `crm-org-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-org-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allCompanies, addCompany, reloadFromApi } = useCompaniesRegistry()
  const { can } = useMenuAccess()
  const canCreateCompany = can('empresas', 'create')
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  /** Bloquea autofill de Chrome hasta el primer foco (readonly trick). */
  const [blockAutofill, setBlockAutofill] = useState(true)

  const selected = useMemo(() => {
    const id = companyId.trim()
    const preset = presetCompany?.name.trim() ? presetCompany : undefined

    if (id) {
      const fromCatalog = findCompanyById(allCompanies, id)
      if (fromCatalog) return fromCatalog
      if (preset && (!preset.id.trim() || preset.id === id)) {
        return companyListItemFromPreset(preset, id)
      }
    }

    if (preset) {
      const byName = findCompanyByName(allCompanies, preset.name)
      if (byName) return byName
      return companyListItemFromPreset(preset, id || undefined)
    }

    return undefined
  }, [allCompanies, companyId, presetCompany])

  const searchableCompanies = useMemo(
    () => (filterCompany ? allCompanies.filter(filterCompany) : allCompanies),
    [allCompanies, filterCompany],
  )

  const lookupPool = useMemo(
    () => mergeCompanyLookupPool(searchableCompanies, presetCompany),
    [presetCompany, searchableCompanies],
  )

  const results = useMemo(
    () => searchCompanies(lookupPool, query, 10),
    [lookupPool, query],
  )

  const queryNorm = query.trim().toLowerCase()
  const showCreateOption =
    canCreateCompany &&
    queryNorm.length > 0 &&
    !results.some((c) => c.name.trim().toLowerCase() === queryNorm) &&
    presetCompany?.name.trim().toLowerCase() !== queryNorm

  useEffect(() => {
    if (!open && !companyId.trim() && !presetCompany?.name?.trim()) return
    if (allCompanies.length > 0) return
    void reloadFromApi().catch(() => {})
  }, [open, companyId, presetCompany?.name, allCompanies.length, reloadFromApi])

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

  const selectCompany = (company: CompanyListItem) => {
    onChange(company.id, company)
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
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
                {selected.logoUrl?.trim() ? (
                  <img
                    src={selected.logoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Building2 aria-hidden className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {selected.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[selected.industry, selected.city].filter(Boolean).join(' · ') ||
                    'Empresa vinculada'}
                </p>
              </div>
              {!disabled ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Cambiar empresa"
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
                    aria-label="Quitar empresa"
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
                placeholder={searchPlaceholder}
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
              {results.length === 0 && !showCreateOption ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Sin resultados
                </li>
              ) : null}
              {results.map((company) => (
                <li key={company.id} role="option">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted',
                      company.id === companyId && 'bg-muted/80',
                    )}
                    onClick={() => selectCompany(company)}
                  >
                    <Building2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{company.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {company.industry} · {company.city}
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
                      Crear empresa «<strong className="font-semibold">{query.trim()}</strong>»
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        {selected && !disabled ? (
          <p className="text-xs text-muted-foreground">
            {selected.id.trim() ? (
              <>
                Vinculado al registro{' '}
                <Link
                  to={`/empresas/${selected.id}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {selected.name}
                </Link>
              </>
            ) : (
              <>
                Empresa vinculada:{' '}
                <span className="font-medium text-foreground">{selected.name}</span>
              </>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {helperText ??
              (canCreateCompany
                ? 'Busca una empresa existente o crea un registro nuevo.'
                : 'Busca una empresa existente en el catálogo.')}
          </p>
        )}
      </ContactFormField>

      {canCreateCompany ? (
        <CreateCompanyDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Nueva empresa"
          description="Se vinculará automáticamente a este contacto."
          initialValues={createDefaultCompanyFormValues({
            name: query.trim(),
            ...createInitialValues,
          })}
          onSubmit={async (values) => {
            const created = await addCompany(values)
            onChange(created.id, created)
            setQuery('')
          }}
        />
      ) : null}
    </>
  )
}
