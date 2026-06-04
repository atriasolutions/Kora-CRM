import { useContext } from 'react'

import { ProjectsRegistryContext } from '@/contexts/projects-registry-context'

export function useProjectsRegistry() {
  const ctx = useContext(ProjectsRegistryContext)
  if (!ctx) {
    throw new Error('useProjectsRegistry debe usarse dentro de ProjectsRegistryProvider')
  }
  return ctx
}
