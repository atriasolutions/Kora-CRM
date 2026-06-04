import { projectListSeed, type ProjectListItem } from '@/data/projects.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { buildEntityActivitiesForDetail } from '@/lib/entity-activity-build'
import { entityFormToCreateValues, type ActivityFormPayload } from '@/lib/entity-activity-form'

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'reunion',
    title: 'Comité de avance semanal',
    description: 'Revisión de avance del plan de trabajo y riesgos abiertos.',
    when: 'Hoy, 09:00',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'email',
    title: 'Acta de kick-off enviada',
    when: '12 may, 16:30',
    createdAt: '12 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'llamada',
    title: 'Coordinación con cliente',
    description: 'Validación de hitos y entregables de la semana.',
    when: '8 may, 11:00',
    createdAt: '10 may 2024',
    author: 'Ana Ruiz',
  },
]

export function projectRelatedIds(project: { id: string }): Set<string> {
  const ids = new Set<string>([project.id])
  const pageMatch = /^proyectos-(\d+)$/.exec(project.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = projectListSeed[idx % projectListSeed.length]
    if (seed) ids.add(seed.id)
  }
  return ids
}

export function buildProjectActivitiesForDetail(
  project: ProjectListItem,
): ContactActivity[] {
  const ids = projectRelatedIds(project)
  return buildEntityActivitiesForDetail({
    relatedType: 'proyecto',
    entityId: project.id,
    relatedName: project.name,
    companyName: project.client,
    relatedIds: ids,
    matchExtra: (a) => a.relatedName === project.name || a.companyName === project.client,
    templates: activityTemplates.map((t) => ({
      ...t,
      author: t.author === 'María López' ? project.manager : t.author,
    })),
    seedRecordFilter: (a) => a.relatedType === 'proyecto',
  })
}

export function projectFormToCreateValues(
  projectId: string,
  projectName: string,
  clientName: string,
  form: ActivityFormPayload,
) {
  return entityFormToCreateValues('proyecto', projectId, projectName, clientName, form)
}
