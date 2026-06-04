import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import { getRegistryProjectById } from '@/data/projects-registry-store'
import { projectListSeed } from '@/data/projects.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import {
  buildJourneyHistory,
  journeyToListStatus,
  resolveJourneyStage,
  type ProjectJourneyHistoryEntry,
  type ProjectJourneyStage,
} from '@/lib/project-journey'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import {
  enrichProjectCommercialLinks,
  resolveProjectRelations,
} from '@/lib/project-relations'
import { buildProjectActivitiesForDetail } from '@/lib/project-activities'
import type { ProjectFile } from '@/lib/project-files'
import type { ProjectAcceptedQuoteLink, ProjectOpportunityLink } from '@/lib/project-relations'

export type ProjectTeamMember = {
  id: string
  name: string
  role: string
}

export type ProjectDetail = ProjectListItem & {
  journeyStage: ProjectJourneyStage
  journeyHistory: ProjectJourneyHistoryEntry[]
  description: string
  opportunity?: ProjectOpportunityLink
  opportunityName?: string
  acceptedQuote?: ProjectAcceptedQuoteLink
  acceptedQuoteCode?: string
  hoursLogged: number
  hoursEstimated: number
  tags: string[]
  team: ProjectTeamMember[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: ProjectFile[]
}

export function resolveProjectListItem(id: string): ProjectListItem {
  const applyJourney = (item: ProjectListItem): ProjectListItem => {
    const journeyStage = resolveJourneyStage(id, item.journeyStage)
    return {
      ...item,
      journeyStage,
      status: journeyToListStatus(journeyStage),
    }
  }

  const fromRegistry = getRegistryProjectById(id)
  if (fromRegistry) return applyJourney({ ...fromRegistry, id })

  const direct = projectListSeed.find((p) => p.id === id)
  if (direct) return applyJourney({ ...direct, id })

  const pageMatch = /^proyectos-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = projectListSeed[idx % projectListSeed.length]
    return applyJourney({ ...seed!, id })
  }

  return applyJourney({ ...projectListSeed[0]!, id })
}

export function getProjectDetail(id: string): ProjectDetail {
  const base = resolveProjectListItem(id)
  const idx = projectListSeed.findIndex((p) => p.id === base.id)
  const enriched = enrichProjectCommercialLinks({
    ...base,
    ...resolveProjectRelations(base),
  })

  const journeyStage = base.journeyStage
  const journeyHistory = buildJourneyHistory(journeyStage, [
    { id: `${id}-jh-1`, stage: 'Nuevo', enteredAt: base.startDate },
    ...(journeyStage !== 'Nuevo'
      ? [
          {
            id: `${id}-jh-cur`,
            stage: journeyStage,
            enteredAt: '14 may 2024',
            note: 'Etapa actual en la ruta del éxito',
          },
        ]
      : []),
  ])

  return {
    ...enriched,
    journeyStage,
    journeyHistory,
    description: `Proyecto de entrega para ${base.client}. Alcance acordado en kick-off; el avance se gestiona en el plan de trabajo (grupos y actividades).`,
    hoursLogged: 120 + idx * 18,
    hoursEstimated: 200 + idx * 25,
    tags: [
      base.priority === 'Alta' ? 'Crítico' : 'Estándar',
      base.health,
      base.status,
    ],
    team: [
      { id: `${id}-tm-1`, name: base.manager, role: 'Gerente de proyecto' },
      { id: `${id}-tm-2`, name: 'Equipo implementación', role: 'Consultor' },
      { id: `${id}-tm-3`, name: 'Soporte N2', role: 'Técnico' },
    ],
    activities: buildProjectActivitiesForDetail(base),
    notes: mergeEntityNotesForMock('proyecto', id, [
      {
        id: `${id}-note-1`,
        body: '<p>Cliente solicitó priorizar módulo de reportes antes del go-live.</p>',
        author: base.manager,
        when: '14 may, 11:00',
      },
    ]),
    files: [],
  }
}
