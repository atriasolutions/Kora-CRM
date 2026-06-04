import { List } from 'lucide-react'

import type { ModuleListConfig } from '@/types/list-module'

export type SettingListItem = {
  id: string
  key: string
  category: string
  value: string
  updated: string
}

const seeds: SettingListItem[] = [
  {
    id: 's1',
    key: 'Nombre de la organización',
    category: 'General',
    value: 'Kora CRM Demo',
    updated: '16 may 2024',
  },
  {
    id: 's2',
    key: 'Zona horaria',
    category: 'General',
    value: 'America/Santiago',
    updated: '10 may 2024',
  },
  {
    id: 's3',
    key: 'Moneda predeterminada',
    category: 'Facturación',
    value: 'USD',
    updated: '8 may 2024',
  },
  {
    id: 's4',
    key: 'IVA / impuesto',
    category: 'Facturación',
    value: '19%',
    updated: '8 may 2024',
  },
  {
    id: 's5',
    key: 'Pipeline por defecto',
    category: 'Ventas',
    value: 'Pipeline principal',
    updated: '5 may 2024',
  },
  {
    id: 's6',
    key: 'Días recordatorio actividad',
    category: 'Ventas',
    value: '1',
    updated: '1 may 2024',
  },
  {
    id: 's7',
    key: 'Autenticación 2FA',
    category: 'Seguridad',
    value: 'Obligatorio para admins',
    updated: '20 abr 2024',
  },
  {
    id: 's8',
    key: 'Retención de logs',
    category: 'Seguridad',
    value: '90 días',
    updated: '15 abr 2024',
  },
]

export const settingsListConfig: ModuleListConfig<SettingListItem> = {
  title: 'Configuración',
  description: 'Preferencias globales del espacio de trabajo.',
  entityPlural: 'opciones',
  newItemLabel: 'Nueva opción',
  total: 28,
  seeds,
  showImport: false,
  viewModes: [{ id: 'lista', label: 'Lista', Icon: List }],
  searchFilter: (row, q) =>
    row.key.toLowerCase().includes(q) ||
    row.category.toLowerCase().includes(q) ||
    row.value.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Opción',
      sortable: true,
      className: 'w-[240px]',
      title: (r) => r.key,
      subtitle: (r) => r.category,
    },
    {
      kind: 'text',
      header: 'Valor',
      className: 'min-w-[200px]',
      cell: (r) => r.value,
    },
    {
      kind: 'text',
      header: 'Actualizado',
      className: 'w-[130px]',
      cell: (r) => r.updated,
    },
  ],
}
