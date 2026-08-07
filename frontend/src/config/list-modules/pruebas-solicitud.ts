import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import { formatChileDateLabel } from '@/lib/chile-timezone'
import { formatPruebaClientProgress } from '@/lib/prueba-solicitud-form'
import type { ModuleListConfig } from '@/types/list-module'

export const pruebasSolicitudListConfig: ModuleListConfig<PruebaSolicitudListItem> = {
  title: 'Pruebas de Solicitud',
  description: 'Documentación de casos de prueba y aprobación del cliente.',
  entityPlural: 'pruebas',
  newItemLabel: 'Nueva prueba',
  total: 0,
  seeds: [],
  minTableWidth: '1040px',
  getDetailPath: (row) => `/pruebas-solicitud/${row.id}`,
  searchFilter: (row, q) =>
    row.code.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    row.solicitudCode.toLowerCase().includes(q) ||
    row.solicitudTitle.toLowerCase().includes(q) ||
    (row.companyName?.toLowerCase().includes(q) ?? false),
  columns: [
    {
      kind: 'primary',
      header: 'Prueba',
      sortable: true,
      sortKey: 'code',
      className: 'w-[200px]',
      title: (r) => r.code,
      subtitle: (r) => r.description || 'Sin descripción',
    },
    {
      kind: 'text',
      header: 'Solicitud',
      sortable: true,
      className: 'w-[200px]',
      cell: (r) => `${r.solicitudCode} · ${r.solicitudTitle}`,
    },
    {
      kind: 'text',
      header: 'Empresa',
      sortable: true,
      className: 'w-[160px]',
      cell: (r) => r.companyName?.trim() || '—',
    },
    {
      kind: 'text',
      header: 'Ejecución',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => (r.executedAt ? formatChileDateLabel(r.executedAt) : '—'),
      sortValue: (r) => r.executedAt || '',
    },
    {
      kind: 'text',
      header: 'Casos',
      sortable: true,
      className: 'w-[80px]',
      cell: (r) => String(r.caseCount),
    },
    {
      kind: 'text',
      header: 'OK cliente',
      sortable: true,
      className: 'w-[100px]',
      cell: (r) => formatPruebaClientProgress(r.clientOkCount, r.caseCount),
    },
    {
      kind: 'text',
      header: 'Actualizado',
      sortable: true,
      sortKey: 'updatedAt',
      className: 'w-[140px]',
      cell: (r) => r.updatedAt?.slice(0, 10) || '—',
      sortValue: (r) => r.updatedAt || '',
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
      header: 'Título',
      sortable: true,
      sortKey: 'title',
      defaultHidden: true,
      className: 'w-[160px]',
      cell: (r) => r.description || '—',
    },
  ],
}
