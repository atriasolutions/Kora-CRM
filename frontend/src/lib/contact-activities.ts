import type { ActivityListItem } from '@/data/activities.mock'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { getAllKnownOpportunities } from '@/data/opportunities-registry-store'
import { getRegistryActivities } from '@/data/activities-registry-store'
import { opportunitiesForContact } from '@/lib/contact-opportunities'
import type { ActivityReminderFormFields } from '@/lib/activity-reminder'
import { defaultDurationFieldForType } from '@/lib/entity-activity-form'

export function contactRelatedIds(contact: { id: string }): Set<string> {
  return new Set<string>([contact.id])
}

export function listItemToContactActivity(item: ActivityListItem): ContactActivity {
  return {
    id: `timeline-${item.id}`,
    recordId: item.id,
    type: item.type,
    title: item.title,
    description: undefined,
    when: item.due,
    createdAt: item.createdAt,
    author: item.assignee,
    status: item.status,
    priority: item.priority,
    relatedType: item.relatedType,
    relatedId: item.relatedId,
    relatedName: item.relatedName,
    companyName: item.companyName,
    outreachResult: item.outreachResult,
    interactionKind: item.interactionKind,
  }
}

function opportunityIdsForContact(contact: ContactListItem): Set<string> {
  const opps = opportunitiesForContact(getAllKnownOpportunities(), contact)
  return new Set(opps.map((o) => o.id))
}

export function activitiesForContact(
  all: ActivityListItem[],
  contact: ContactListItem,
): ContactActivity[] {
  const ids = contactRelatedIds(contact)
  const oppIds = opportunityIdsForContact(contact)

  return all
    .filter((a) => {
      if (
        a.relatedType === 'contacto' &&
        (ids.has(a.relatedId) || a.relatedName === contact.name)
      ) {
        return true
      }
      if (a.relatedType === 'oportunidad' && oppIds.has(a.relatedId)) {
        return true
      }
      return false
    })
    .map((item) => listItemToContactActivity(item))
}

export function buildContactActivitiesForDetail(
  contact: ContactListItem,
): ContactActivity[] {
  return activitiesForContact(getRegistryActivities(), contact)
}

export function contactFormToCreateValues(
  contactId: string,
  contactName: string,
  companyName: string,
  form: {
    type: ContactActivityType
    title: string
    description: string
    scheduledAt: string
    author: string
    priority: ActivityListItem['priority']
    status: ActivityListItem['status']
  } & ActivityReminderFormFields,
) {
  return {
    title: form.title,
    type: form.type,
    relatedType: 'contacto' as const,
    relatedName: contactName,
    companyName: companyName || contactName,
    scheduledAt: form.scheduledAt,
    assigneeName: form.author,
    priority: form.priority,
    status: form.status,
    relatedId: contactId,
    durationMinutes: defaultDurationFieldForType(form.type),
    reminderPreset: form.reminderPreset,
    reminderCustomAt: form.reminderCustomAt,
  }
}
