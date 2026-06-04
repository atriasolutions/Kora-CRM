import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { MenuModuleId } from '@/lib/menu-modules'

type DetailHeaderHandlers = {
  onStartEdit?: () => void
  onArchive?: () => void
}

/** Oculta editar/archivar en cabeceras de detalle según permisos del módulo. */
export function useDetailHeaderPermissions(
  moduleId: MenuModuleId,
  handlers: DetailHeaderHandlers,
) {
  const { canEdit, canDelete } = useModulePermissions(moduleId)
  return {
    showEdit: canEdit && Boolean(handlers.onStartEdit),
    showArchive: canDelete && Boolean(handlers.onArchive),
  }
}
