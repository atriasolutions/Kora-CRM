import { createContext } from 'react'

import type { ProjectDetail } from '@/data/project-detail.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import type { CreateProjectFormValues } from '@/lib/project-create'
import type { ArchivedProjectRecord } from '@/lib/project-archive'

export type ArchivedProjectEntry = ArchivedProjectRecord & {
  project: ProjectListItem
}

export type ProjectsRegistryContextValue = {
  userProjects: ProjectListItem[]
  allProjects: ProjectListItem[]
  archivedProjects: ArchivedProjectEntry[]
  findById: (id: string) => ProjectListItem | undefined
  addProject: (values: CreateProjectFormValues) => Promise<ProjectListItem>
  addProjects: (values: CreateProjectFormValues[]) => Promise<ProjectListItem[]>
  updateProject: (id: string, patch: Partial<ProjectListItem>) => Promise<void>
  updateProjectFromDetail: (detail: ProjectDetail) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  archiveProjects: (ids: string[]) => Promise<void>
  restoreProject: (id: string) => Promise<void>
  restoreProjects: (ids: string[]) => Promise<void>
  permanentlyDeleteProject: (id: string) => Promise<void>
  permanentlyDeleteProjects: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const ProjectsRegistryContext =
  createContext<ProjectsRegistryContextValue | null>(null)
