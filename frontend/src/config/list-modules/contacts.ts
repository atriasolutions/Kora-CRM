import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import type { ModuleListConfig } from '@/types/list-module'
import {
  outreachBadgeVariant,
  outreachFilterStatusLabel,
  resolveOutreachFilterStatus,
} from '@/lib/contact-outreach'

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

export const contactsListConfig: ModuleListConfig<ContactListItem> = {
  title: 'Contactos',
  description: 'Gestiona relaciones comerciales y seguimiento.',
  entityPlural: 'contactos',
  newItemLabel: 'Nuevo contacto',
  total: 0,
  seeds: [],
  rowActions: 'contact',
  getDetailPath: (row) => `/contactos/${row.id}`,
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.company.toLowerCase().includes(q) ||
    row.email.toLowerCase().includes(q) ||
    row.phone.includes(q) ||
    row.role.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Nombre',
      sortable: true,
      sortKey: 'name',
      className: 'w-[260px]',
      title: (r) => r.name,
      subtitle: (r) => r.subtitle,
      avatarUrl: (r) => r.avatarUrl,
    },
    {
      kind: 'text',
      header: 'Empresa',
      sortable: true,
      sortKey: 'company',
      className: 'w-[132px]',
      cell: (r) => r.company,
    },
    {
      kind: 'text',
      header: 'Email',
      sortable: true,
      sortKey: 'email',
      className: 'min-w-[200px]',
      cell: (r) => r.email,
      mono: true,
    },
    {
      kind: 'text',
      header: 'Teléfono',
      sortable: true,
      sortKey: 'phone',
      className: 'w-[128px]',
      cell: (r) => r.phone,
      truncate: true,
    },
    {
      kind: 'text',
      header: 'Cargo',
      sortable: true,
      sortKey: 'role',
      defaultHidden: true,
      className: 'w-[148px]',
      cell: (r) => r.role,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[120px]',
      label: (r) => r.status,
      variant: (r) => statusVariant(r.status),
    },
    {
      kind: 'badge',
      header: 'Intento',
      sortable: true,
      className: 'w-[128px]',
      label: (r) => outreachFilterStatusLabel(resolveOutreachFilterStatus(r)),
      variant: (r) => outreachBadgeVariant(resolveOutreachFilterStatus(r)),
    },
    {
      kind: 'text',
      header: 'Último intento',
      sortable: true,
      className: 'w-[190px]',
      cell: (r) => r.lastOutreachLabel ?? r.lastContactLabel,
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      sortKey: 'owner',
      defaultHidden: true,
      className: 'w-[130px]',
      cell: (r) => r.ownerName?.trim() || '—',
    },
    {
      kind: 'text',
      header: 'Creado',
      sortable: true,
      sortKey: 'createdAt',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) => r.createdAt?.slice(0, 10) || '—',
      sortValue: (r) => r.createdAt || '',
    },
    {
      kind: 'text',
      header: 'Actualizado',
      sortable: true,
      sortKey: 'updatedAt',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) => r.updatedAt?.slice(0, 10) || '—',
      sortValue: (r) => r.updatedAt || '',
    },
  ],
}
