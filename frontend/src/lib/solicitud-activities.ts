import { solicitudListSeed, type SolicitudListItem } from '@/data/solicitudes.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { buildEntityActivitiesForDetail } from '@/lib/entity-activity-build'
import { entityFormToCreateValues, type ActivityFormPayload } from '@/lib/entity-activity-form'

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'reunion',
    title: 'Revisión de avance',
    description: 'Seguimiento del estado y próximos pasos de la solicitud.',
    when: 'Hoy, 10:00',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'email',
    title: 'Actualización enviada al cliente',
    when: '12 may, 16:30',
    createdAt: '12 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'llamada',
    title: 'Coordinación interna',
    description: 'Alineación de responsables y plazos.',
    when: '8 may, 11:00',
    createdAt: '10 may 2024',
    author: 'Ana Ruiz',
  },
]

export function solicitudRelatedIds(solicitud: { id: string }): Set<string> {
  const ids = new Set<string>([solicitud.id])
  const pageMatch = /^solicitudes-(\d+)$/.exec(solicitud.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = solicitudListSeed[idx % solicitudListSeed.length]
    if (seed) ids.add(seed.id)
  }
  return ids
}

export function buildSolicitudActivitiesForDetail(
  solicitud: SolicitudListItem,
): ContactActivity[] {
  const ids = solicitudRelatedIds(solicitud)
  return buildEntityActivitiesForDetail({
    relatedType: 'solicitud',
    entityId: solicitud.id,
    relatedName: solicitud.title,
    companyName: solicitud.code,
    relatedIds: ids,
    matchExtra: (a) =>
      a.relatedName === solicitud.title || a.companyName === solicitud.code,
    templates: activityTemplates.map((t) => ({
      ...t,
      author: t.author === 'María López' ? solicitud.assignee : t.author,
    })),
    seedRecordFilter: (a) => a.relatedType === 'solicitud',
  })
}

export function solicitudFormToCreateValues(
  solicitudId: string,
  solicitudTitle: string,
  solicitudCode: string,
  form: ActivityFormPayload,
) {
  return entityFormToCreateValues('solicitud', solicitudId, solicitudTitle, solicitudCode, form)
}
