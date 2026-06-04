import { Archive, LayoutGrid, List, PanelsTopLeft } from 'lucide-react'

import type { ModuleViewOption } from '@/components/list/ModuleViewSwitcher'

export type StandardModuleViewId = 'lista' | 'kanban' | 'segmentos' | 'archivados'

export const STANDARD_MODULE_VIEW_OPTIONS: ModuleViewOption<StandardModuleViewId>[] = [
  {
    id: 'lista',
    label: 'Lista',
    description: 'Tabla con columnas y paginación',
    Icon: List,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Tarjetas por etapa del ciclo',
    Icon: LayoutGrid,
  },
  {
    id: 'segmentos',
    label: 'Segmentos',
    description: 'Listas dinámicas guardadas',
    Icon: PanelsTopLeft,
  },
  {
    id: 'archivados',
    label: 'Archivados',
    description: 'Papelera de reciclaje',
    Icon: Archive,
  },
]

/** Inventario: lista, kanban y segmentos (sin papelera). */
export type InventoryModuleViewId = 'lista' | 'kanban' | 'segmentos'

export const INVENTORY_MODULE_VIEW_OPTIONS: ModuleViewOption<InventoryModuleViewId>[] = [
  {
    id: 'lista',
    label: 'Lista',
    description: 'Tabla con columnas y paginación',
    Icon: List,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Tarjetas por etapa del ciclo',
    Icon: LayoutGrid,
  },
  {
    id: 'segmentos',
    label: 'Segmentos',
    description: 'Listas dinámicas guardadas',
    Icon: PanelsTopLeft,
  },
]

export type ListArchiveViewId = 'lista' | 'archivados'

export const LIST_ARCHIVE_VIEW_OPTIONS: ModuleViewOption<ListArchiveViewId>[] = [
  {
    id: 'lista',
    label: 'Lista',
    description: 'Tabla con columnas y paginación',
    Icon: List,
  },
  {
    id: 'archivados',
    label: 'Archivados',
    description: 'Papelera de reciclaje',
    Icon: Archive,
  },
]
