import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import type { BadgeProps } from '@/components/ui/badge'

export type ListRowBase = { id: string }

export type BadgeVariant = NonNullable<BadgeProps['variant']>

export type ViewModeOption = {
  id: string
  label: string
  Icon: LucideIcon
}

export type ListColumnDef<T extends ListRowBase> =
  | {
      kind: 'primary'
      header: string
      sortable?: boolean
      title: (row: T) => string
      subtitle?: (row: T) => string
      avatarUrl?: (row: T) => string | undefined
      /** Carga foto desde GET /users/:id cuando el listado no trae imagen embebida. */
      avatarResolveUserId?: (row: T) => string | undefined
      initials?: (row: T) => string
      className?: string
    }
  | {
      kind: 'text'
      header: string
      sortable?: boolean
      sortValue?: (row: T) => string | number
      className?: string
      cell: (row: T) => string
      mono?: boolean
      truncate?: boolean
    }
  | {
      kind: 'badge'
      header: string
      sortable?: boolean
      sortValue?: (row: T) => string | number
      className?: string
      label: (row: T) => string
      variant: (row: T) => BadgeVariant
    }
  | {
      kind: 'custom'
      header: string
      className?: string
      render: (row: T) => ReactNode
    }

export type ModuleListConfig<T extends ListRowBase> = {
  title: string
  description: string
  /** Ej. "contactos", "empresas" — para paginación y búsqueda */
  entityPlural: string
  newItemLabel: string
  total: number
  seeds: T[]
  searchFilter: (row: T, query: string) => boolean
  columns: ListColumnDef<T>[]
  viewModes?: ViewModeOption[]
  showImport?: boolean
  minTableWidth?: string
  rowActions?: 'contact' | 'default'
  /** Muestra la columna «Acciones» al final de la tabla (por defecto true). */
  showRowActions?: boolean
  alternateViewMessage?: string
  /** Si se define, la fila y «Ver detalle» navegan a esta ruta. */
  getDetailPath?: (row: T) => string
}
