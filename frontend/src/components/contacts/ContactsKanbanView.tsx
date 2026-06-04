import { Mail, MoreHorizontal, Phone } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { KanbanColumnMore } from '@/components/list/KanbanColumnMore'
import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { normalizeContactStatus } from '@/lib/contact-form'
import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { filterContacts, KANBAN_COLUMNS } from '@/data/contacts-views.mock'
import type { ContactFilters } from '@/lib/contact-filters'
import {
  contactMatchesListScope,
  sortContactsByRecentlyViewed,
  type ContactListScope,
} from '@/lib/contact-list-scope'
import { getEmailHref } from '@/lib/email'
import { contactDisplayPhone } from '@/lib/contact-form'
import { getTelHref } from '@/lib/phone'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
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

const columnSurface: Record<ContactLifecycleStatus, string> = {
  Prospecto: 'bg-sky-50/80 dark:bg-sky-950/20',
  Cliente: 'bg-emerald-50/80 dark:bg-emerald-950/20',
  Proveedor: 'bg-amber-50/80 dark:bg-amber-950/20',
}

type ContactsKanbanViewProps = {
  query: string
  filters: ContactFilters
  listScope: ContactListScope
  recentIds: string[]
  onEditContact?: (contact: ContactListItem) => void
  onArchiveContact?: (contact: ContactListItem) => void
}

export function ContactsKanbanView({
  query,
  filters,
  listScope,
  recentIds,
  onEditContact,
  onArchiveContact,
}: ContactsKanbanViewProps) {
  const navigate = useNavigate()
  const { allContacts, isArchived } = useContactsRegistry()

  const contacts = useMemo(() => {
    let result = filterContacts(allContacts, query, filters).filter(
      (c) =>
        !isArchived(c.id) && contactMatchesListScope(c, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortContactsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allContacts, query, filters, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<ContactLifecycleStatus, ContactListItem[]> = {
      Prospecto: [],
      Cliente: [],
      Proveedor: [],
    }
    contacts.forEach((c) => {
      const status = normalizeContactStatus(c.status)
      map[status].push({ ...c, status })
    })
    return map
  }, [contacts])

  const columnKeys = useMemo(
    () => KANBAN_COLUMNS.map((c) => c.status),
    [],
  )
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [contacts.length, query, listScope, filters],
  )

  if (contacts.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay contactos para «{query}»
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Prueba con otro término o limpia la búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={contacts.length}
        entityLabel="contactos"
        viewMode="kanban"
      />
      <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[min(100%,960px)] gap-4 lg:min-w-[960px]">
        {KANBAN_COLUMNS.map(({ status, description }) => {
          const cards = byStatus[status]
          const visibleCards = sliceForColumn(status, cards)
          return (
            <section
              key={status}
              className={cn(
                'flex w-[min(100%,320px)] shrink-0 flex-col rounded-xl border border-border',
                columnSurface[status],
              )}
            >
              <header className="border-b border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{status}</h2>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Badge variant={statusVariant(status)} className="tabular-nums">
                    {cards.length}
                  </Badge>
                </div>
              </header>
              <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
                {cards.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border/80 bg-card/50 px-3 py-8 text-center text-xs text-muted-foreground">
                    Sin contactos en esta columna
                  </li>
                ) : (
                  visibleCards.map((contact) => (
                    <li key={contact.id}>
                      <article
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/contactos/${contact.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/contactos/${contact.id}`)
                          }
                        }}
                        className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="size-9 border border-border">
                            <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                            <AvatarFallback className="text-xs">
                              {initials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">
                              {contact.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {contact.company}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                                aria-label="Más acciones"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal aria-hidden className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEditContact ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditContact(contact)
                                  }}
                                >
                                  Editar
                                </DropdownMenuItem>
                              ) : null}
                              {onEditContact && onArchiveContact ? (
                                <DropdownMenuSeparator />
                              ) : null}
                              {onArchiveContact ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onArchiveContact(contact)
                                  }}
                                >
                                  Archivar
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                          {contact.role}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {contact.lastContactLabel}
                        </p>
                        <div className="mt-3 flex gap-1 border-t border-border pt-2">
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
                          {(() => {
                            const emailHref = getEmailHref(contact.email)
                            return emailHref ? (
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
                            )
                          })()}
                        </div>
                      </article>
                    </li>
                  ))
                )}
                <KanbanColumnMore
                  hiddenCount={hiddenInColumn(status, cards.length)}
                  onLoadMore={() => loadMoreForColumn(status)}
                />
              </ul>
            </section>
          )
        })}
      </div>
    </div>
    </div>
  )
}
