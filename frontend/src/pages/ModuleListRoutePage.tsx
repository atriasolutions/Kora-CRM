import { ModuleListPage } from '@/components/list/ModuleListPage'
import {
  getListModuleConfig,
  type ListModuleSlug,
} from '@/config/list-modules'

type ModuleListRoutePageProps = {
  slug: ListModuleSlug
}

export function ModuleListRoutePage({ slug }: ModuleListRoutePageProps) {
  const config = getListModuleConfig(slug)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ModuleListPage config={config} />
    </div>
  )
}
