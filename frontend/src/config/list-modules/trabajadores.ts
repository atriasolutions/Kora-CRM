import type { WorkerListItem } from '@/data/workers.mock'
import { workerStatusVariant } from '@/lib/worker-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { WorkerListItem }

export const trabajadoresListConfig: ModuleListConfig<WorkerListItem> = {
  title: 'Trabajadores',
  description: 'Fichas de personal, contratos, vacaciones y liquidaciones.',
  entityPlural: 'trabajadores',
  newItemLabel: 'Nuevo trabajador',
  total: 0,
  seeds: [],
  minTableWidth: '1000px',
  getDetailPath: (row) => `/trabajadores/${row.id}`,
  searchFilter: (row, q) =>
    row.number.toLowerCase().includes(q) ||
    row.fullName.toLowerCase().includes(q) ||
    row.taxId.toLowerCase().includes(q) ||
    row.jobTitle.toLowerCase().includes(q) ||
    row.businessUnit.toLowerCase().includes(q) ||
    row.email.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Trabajador',
      sortable: true,
      sortKey: 'fullName',
      className: 'w-[220px]',
      title: (r) => r.fullName,
      subtitle: (r) => r.jobTitle || r.number,
      avatarUrl: (r) => r.avatarUrl || undefined,
      initials: (r) =>
        r.fullName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0] ?? '')
          .join('')
          .toUpperCase(),
    },
    {
      kind: 'text',
      header: 'RUT',
      sortable: false,
      className: 'w-[120px]',
      cell: (r) => r.taxId || '—',
    },
    {
      kind: 'text',
      header: 'Unidad',
      sortable: true,
      sortKey: 'businessUnit',
      className: 'w-[140px]',
      cell: (r) => r.businessUnit || '—',
    },
    {
      kind: 'text',
      header: 'Contrato',
      sortable: true,
      sortKey: 'contractType',
      className: 'w-[120px]',
      cell: (r) => r.contractType,
    },
    {
      kind: 'text',
      header: 'Sueldo base',
      sortable: true,
      sortKey: 'baseSalary',
      className: 'w-[120px]',
      cell: (r) => r.baseSalary,
      sortValue: (r) => r.baseSalaryNum,
    },
    {
      kind: 'text',
      header: 'Ingreso',
      sortable: true,
      sortKey: 'startDate',
      className: 'w-[120px]',
      cell: (r) => r.startDate || '—',
      sortValue: (r) => r.startDateIso || r.startDate,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[120px]',
      label: (r) => r.status,
      variant: (r) => workerStatusVariant(r.status),
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      sortKey: 'owner',
      defaultHidden: true,
      className: 'w-[130px]',
      cell: (r) => r.owner,
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
