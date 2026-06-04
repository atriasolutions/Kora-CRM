import { pathToModuleId, type MenuModuleId } from '@/lib/menu-modules'

export type HelpView = 'dashboard' | 'list' | 'detail'

export type HelpContext = {
  moduleId: MenuModuleId | null
  view: HelpView
  /** Clave para buscar en `HELP_CONTENT` (ej. `contactos.detail`). */
  contentKey: string
}

/**
 * Resuelve módulo y vista (listado vs ficha) según la ruta actual.
 */
export function resolveHelpContext(pathname: string): HelpContext {
  const pathOnly = pathname.split('?')[0] ?? pathname
  const normalized = pathOnly.replace(/\/+$/, '') || '/'

  if (normalized === '/' || normalized === '') {
    return {
      moduleId: 'dashboard',
      view: 'dashboard',
      contentKey: 'dashboard',
    }
  }

  const withLeading = normalized.startsWith('/') ? normalized : `/${normalized}`
  const moduleId = pathToModuleId(withLeading)
  const segments = withLeading.replace(/^\//, '').split('/').filter(Boolean)
  const hasSecondSegment = Boolean(segments[1])

  if (!moduleId) {
    return {
      moduleId: null,
      view: 'list',
      contentKey: 'generic',
    }
  }

  if (moduleId === 'dashboard') {
    return {
      moduleId: 'dashboard',
      view: 'dashboard',
      contentKey: 'dashboard',
    }
  }

  const view: HelpView = hasSecondSegment ? 'detail' : 'list'
  const contentKey = `${moduleId}.${view}` as const
  return { moduleId, view, contentKey }
}
