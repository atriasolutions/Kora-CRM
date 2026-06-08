import { ChevronRight, Mail, Phone, Plus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateContactDialog } from '@/components/contacts/CreateContactDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EntityAvatarImage } from '@/components/shared/EntityAvatarImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CompanyDetail } from '@/data/company-detail.mock'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  contactsForCompany,
  createContactInitialFromCompany,
} from '@/lib/company-contacts'
import type { CreateContactFormValues } from '@/lib/contact-create'
import { contactDisplayPhone } from '@/lib/contact-form'
import { initialsFromLabel } from '@/lib/image-upload'

type CompanyContactsPanelProps = {
  company: CompanyDetail
  onCountChange?: (count: number) => void
}

function statusVariant(
  status: CreateContactFormValues['status'],
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

export function CompanyContactsPanel({
  company,
  onCountChange,
}: CompanyContactsPanelProps) {
  const navigate = useNavigate()
  const { canCreate } = useModulePermissions('contactos')
  const { allContacts, addContact } = useContactsRegistry()
  const [createOpen, setCreateOpen] = useState(false)

  const related = useMemo(
    () =>
      contactsForCompany(allContacts, {
        id: company.id,
        name: company.name,
      }),
    [allContacts, company.id, company.name],
  )

  const createInitial = useMemo(
    () =>
      createContactInitialFromCompany({
        id: company.id,
        name: company.name,
        owner: company.owner,
        ownerDetail: company.ownerDetail,
      }),
    [company.id, company.name, company.owner, company.ownerDetail],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  const handleCreate = async (values: CreateContactFormValues) => {
    const item = await addContact(values)
    navigate(`/contactos/${item.id}`)
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Contactos</CardTitle>
          {canCreate ? (
            <Button
              type="button"
              size="sm"
              className="shadow-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden className="size-4" />
              Nuevo contacto
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {related.length === 0 ? (
            <div className="py-8 text-center">
              <Users
                aria-hidden
                className="mx-auto mb-3 size-10 text-muted-foreground"
              />
              <p className="text-sm font-medium text-foreground">
                Sin contactos vinculados
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Registra personas asociadas a {company.name}.
              </p>
              {canCreate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 border-border"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus aria-hidden className="size-4" />
                  Crear contacto
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {related.map((contact) => {
                const phone = contactDisplayPhone(contact)
                return (
                  <li key={contact.id}>
                    <Link
                      to={`/contactos/${contact.id}`}
                      className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="size-10 shrink-0 border border-border">
                          {contact.avatarUrl ? (
                            <EntityAvatarImage src={contact.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs font-medium">
                            {initialsFromLabel(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground group-hover:text-primary">
                            {contact.name}
                          </p>
                          {contact.role?.trim() ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {contact.role}
                            </p>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {contact.email?.trim() ? (
                              <span className="inline-flex items-center gap-1">
                                <Mail aria-hidden className="size-3" />
                                {contact.email}
                              </span>
                            ) : null}
                            {phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone aria-hidden className="size-3" />
                                {phone}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        <Badge variant={statusVariant(contact.status)}>
                          {contact.status}
                        </Badge>
                        <ChevronRight
                          aria-hidden
                          className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {canCreate ? (
        <CreateContactDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Nuevo contacto"
          description={`Empresa ${company.name} preseleccionada. Completa la ficha del contacto.`}
          initialValues={createInitial}
          onSubmit={handleCreate}
        />
      ) : null}
    </>
  )
}
