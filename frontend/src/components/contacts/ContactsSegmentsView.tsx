import { ChevronRight, Mail, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import {
  contactSegments,
  countSegmentMatches,
  filterContacts,
} from '@/data/contacts-views.mock'
import type { ContactFilters } from '@/lib/contact-filters'
import {
  contactMatchesListScope,
  sortContactsByRecentlyViewed,
  type ContactListScope,
} from '@/lib/contact-list-scope'
import { getEmailHref } from '@/lib/email'
import { contactDisplayPhone } from '@/lib/contact-form'
import { getTelHref } from '@/lib/phone'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

function statusVariant(
  status: ContactLifecycleStatus,
): 'customer' | 'prospect' | 'lead' | 'supplier' {
  switch (status) {
    case 'Cliente':
      return 'customer'
    case 'Prospecto':
      return 'prospect'
    case 'Proveedor':
      return 'supplier'
    default:
      return 'prospect'
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

type ContactsSegmentsViewProps = {
  query: string
  filters: ContactFilters
  listScope: ContactListScope
  recentIds: string[]
}

export function ContactsSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: ContactsSegmentsViewProps) {
  const navigate = useNavigate()
  const { allContacts: registryContacts, isArchived } = useContactsRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(contactSegments[0]!.id)

  const allContacts = registryContacts
  const searched = useMemo(() => {
    let result = filterContacts(allContacts, query, filters).filter(
      (c) =>
        !isArchived(c.id) && contactMatchesListScope(c, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortContactsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allContacts, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => contactSegments.find((s) => s.id === activeSegmentId) ?? contactSegments[0]!,
    [activeSegmentId],
  )

  const segmentContacts = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentContacts, [
    activeSegmentId,
    query,
    listScope,
    filters,
  ])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        contactSegments.map((s) => [s.id, countSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="contactos"
        viewMode="segmentos"
      />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Segmentos guardados
        </p>
        <ul className="space-y-2">
          {contactSegments.map((segment) => {
            const count = counts[segment.id] ?? 0
            const isActive = segment.id === activeSegmentId
            return (
              <li key={segment.id}>
                <button
                  type="button"
                  onClick={() => setActiveSegmentId(segment.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-start shadow-sm transition-colors',
                    'border-s-4',
                    segment.accentClass,
                    isActive && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{segment.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {segment.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {count}
                  </Badge>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="min-w-0 flex-1 rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{activeSegment.name}</h2>
            <p className="text-sm text-muted-foreground">{activeSegment.description}</p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {pagination.total} contacto{pagination.total === 1 ? '' : 's'}
          </p>
        </header>

        {pagination.total === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {query.trim()
                ? `Ningún resultado en «${activeSegment.name}» para «${query}»`
                : `Este segmento no tiene contactos por ahora`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cambia de segmento o ajusta la búsqueda.
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((contact) => (
                <SegmentContactRow
                  key={contact.id}
                  contact={contact}
                  onOpen={() => navigate(`/contactos/${contact.id}`)}
                />
              ))}
            </ul>
            <SegmentsListPagination
              total={pagination.total}
              rangeFrom={pagination.rangeFrom}
              rangeTo={pagination.rangeTo}
              page={pagination.page}
              totalPages={pagination.totalPages}
              canPrev={pagination.canPrev}
              canNext={pagination.canNext}
              onPrev={() => pagination.setPage((p) => p - 1)}
              onNext={() => pagination.setPage((p) => p + 1)}
              entityLabel="contactos"
            />
          </>
        )}
      </section>
    </div>
    </div>
  )
}

function SegmentContactRow({
  contact,
  onOpen,
}: {
  contact: ContactListItem
  onOpen: () => void
}) {
  const emailHref = getEmailHref(contact.email)
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        className="group flex cursor-pointer flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-10 border border-border">
            <AvatarImage src={contact.avatarUrl} alt={contact.name} />
            <AvatarFallback>{initials(contact.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground group-hover:text-primary">
              {contact.name}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {contact.role} · {contact.company}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{contact.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant={statusVariant(contact.status)}>{contact.status}</Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {contact.lastContactLabel}
          </span>
          <div className="flex items-center gap-1">
            {(() => {
              const telHref = getTelHref(contactDisplayPhone(contact))
              return telHref ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  asChild
                >
                  <a
                    href={telHref}
                    aria-label={`Llamar a ${contact.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone aria-hidden className="size-3.5" />
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  disabled
                  aria-label={`Sin teléfono para ${contact.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone aria-hidden className="size-3.5" />
                </Button>
              )
            })()}
            {emailHref ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                asChild
              >
                <a
                  href={emailHref}
                  aria-label={`Enviar email a ${contact.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail aria-hidden className="size-3.5" />
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                disabled
                aria-label={`Sin email para ${contact.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Mail aria-hidden className="size-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label={`Ver ficha de ${contact.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
            >
              <ChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  )
}
