import type { ContactActivityType, ContactNote } from '@/data/contact-detail.mock'
import { getRegistryActivityById } from '@/data/activities-registry-store'
import { activityListSeed } from '@/data/activities.mock'
import type {
  ActivityListItem,
  ActivityPriority,
  ActivityRelatedType,
  ActivityStatus,
} from '@/data/activities.mock'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'

export type ActivityStatusHistoryEntry = {
  id: string
  status: ActivityStatus
  at: string
  note?: string
}

export type ActivityDetail = ActivityListItem & {
  description: string
  scheduledAt: string
  durationMinutes: number
  location?: string
  outcome?: string
  reminder: string
  tags: string[]
  statusHistory: ActivityStatusHistoryEntry[]
  notes: ContactNote[]
  completedAt?: string
}

export function resolveActivityListItem(
  id: string,
  base?: ActivityListItem,
): ActivityListItem {
  const fromRegistry = getRegistryActivityById(id)
  if (fromRegistry) return { ...fromRegistry, id }
  if (base) return { ...base, id }

  const direct = activityListSeed.find((a) => a.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^actividades-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = activityListSeed[idx % activityListSeed.length]
    return { ...seed!, id }
  }

  throw new Error(`Actividad no encontrada: ${id}`)
}

function statusHistoryFor(activity: ActivityListItem, id: string): ActivityStatusHistoryEntry[] {
  const chain: ActivityStatus[] = (() => {
    switch (activity.status) {
      case 'Pendiente':
        return ['Pendiente']
      case 'En curso':
        return ['Pendiente', 'En curso']
      case 'Vencida':
        return ['Pendiente', 'Vencida']
      case 'Completada':
        return ['Pendiente', 'En curso', 'Completada']
    }
  })()

  const dates = ['12 may 2024', '13 may 2024', '14 may 2024', '15 may 2024']
  return chain.map((status, i) => ({
    id: `${id}-st-${i}`,
    status,
    at: dates[i] ?? dates[dates.length - 1]!,
    note: status === activity.status ? 'Estado actual' : undefined,
  }))
}

export function getActivityDetail(id: string): ActivityDetail {
  const base = resolveActivityListItem(id)
  const idx = activityListSeed.findIndex((a) => a.id === base.id)

  const descriptions: Record<ContactActivityType, string> = {
    llamada: 'Llamada de seguimiento comercial para validar próximos pasos y objeciones.',
    email: 'Comunicación escrita con resumen de acuerdos y documentación adjunta.',
    reunion: 'Reunión presencial o videollamada con stakeholders del cliente.',
    nota: 'Registro interno de contexto para el equipo.',
    whatsapp: 'Mensaje rápido de coordinación o recordatorio.',
  }

  return {
    ...base,
    description: descriptions[base.type],
    scheduledAt: base.due,
    durationMinutes: base.type === 'reunion' ? 60 : base.type === 'llamada' ? 30 : 15,
    location: base.type === 'reunion' ? 'Google Meet / Oficina cliente' : undefined,
    outcome:
      base.status === 'Completada'
        ? 'Cliente confirmó interés; se agenda siguiente paso.'
        : base.status === 'Vencida'
          ? 'No hubo respuesta; reagendar.'
          : undefined,
    reminder:
      base.reminder ?? (idx % 2 === 0 ? '15 minutos antes' : '1 hora antes'),
    tags: [
      base.priority === 'Alta' ? 'Urgente' : 'Seguimiento',
      base.relatedType,
    ],
    statusHistory: statusHistoryFor(base, id),
    notes: mergeEntityNotesForMock('actividad', id, [
      {
        id: `act-note-${id}-1`,
        body: '<p>Coordinar con área legal si el cliente pide revisión de contrato.</p>',
        author: base.assignee,
        when: '14 may, 09:00',
      },
    ]),
    completedAt: base.status === 'Completada' ? '15 may 2024, 11:45' : undefined,
  }
}

export type { ActivityRelatedType, ActivityPriority, ActivityStatus }
