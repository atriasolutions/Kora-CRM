import { List } from 'lucide-react'

import type { ModuleListConfig } from '@/types/list-module'

export type ReportListItem = {
  id: string
  name: string
  type: string
  author: string
  lastRun: string
  schedule: string
}

const seeds: ReportListItem[] = [
  {
    id: 'r1',
    name: 'Pipeline por etapa',
    type: 'Ventas',
    author: 'María López',
    lastRun: 'Hoy, 08:00',
    schedule: 'Diario',
  },
  {
    id: 'r2',
    name: 'Ingresos vs. meta',
    type: 'Finanzas',
    author: 'Carlos Vega',
    lastRun: 'Ayer, 18:30',
    schedule: 'Semanal',
  },
  {
    id: 'r3',
    name: 'Actividades del equipo',
    type: 'Operaciones',
    author: 'Ana Ruiz',
    lastRun: '14 may, 09:15',
    schedule: 'Diario',
  },
  {
    id: 'r4',
    name: 'Conversión leads',
    type: 'Marketing',
    author: 'Laura Fernández',
    lastRun: '12 may, 11:00',
    schedule: 'Mensual',
  },
  {
    id: 'r5',
    name: 'Facturas pendientes',
    type: 'Finanzas',
    author: 'Roberto Sánchez',
    lastRun: '16 may, 07:45',
    schedule: 'Diario',
  },
  {
    id: 'r6',
    name: 'Proyectos en riesgo',
    type: 'Proyectos',
    author: 'Diego Méndez',
    lastRun: '10 may, 16:20',
    schedule: 'Semanal',
  },
  {
    id: 'r7',
    name: 'NPS clientes',
    type: 'CX',
    author: 'Valentina Torres',
    lastRun: '1 may, 12:00',
    schedule: 'Trimestral',
  },
  {
    id: 'r8',
    name: 'Uso por módulo',
    type: 'Producto',
    author: 'María López',
    lastRun: '15 may, 10:30',
    schedule: 'Semanal',
  },
]

export const reportsListConfig: ModuleListConfig<ReportListItem> = {
  title: 'Reportes',
  description: 'Informes guardados y programados.',
  entityPlural: 'reportes',
  newItemLabel: 'Nuevo reporte',
  total: 24,
  seeds,
  showImport: false,
  viewModes: [{ id: 'lista', label: 'Lista', Icon: List }],
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.type.toLowerCase().includes(q) ||
    row.author.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Reporte',
      sortable: true,
      className: 'w-[220px]',
      title: (r) => r.name,
      subtitle: (r) => r.type,
    },
    {
      kind: 'text',
      header: 'Autor',
      className: 'w-[140px]',
      cell: (r) => r.author,
    },
    {
      kind: 'text',
      header: 'Última ejecución',
      className: 'w-[150px]',
      cell: (r) => r.lastRun,
    },
    {
      kind: 'text',
      header: 'Programación',
      className: 'w-[120px]',
      cell: (r) => r.schedule,
    },
  ],
}
