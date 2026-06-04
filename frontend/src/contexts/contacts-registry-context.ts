import { createContext } from 'react'

import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { CreateContactFormValues } from '@/lib/contact-create'
import type { ArchivedContactRecord } from '@/lib/contact-archive'
import type { ActivityListItem } from '@/data/activities.mock'
import type {
  ContactOutreachFormValues,
} from '@/lib/contact-outreach'

export type ArchivedContactEntry = ArchivedContactRecord & {
  contact: ContactListItem
}

export type LogContactOutreachPayload = {
  updatedContact: ContactListItem
  activityItem: ActivityListItem
}

export type ContactsRegistryContextValue = {
  userContacts: ContactListItem[]
  allContacts: ContactListItem[]
  archivedContacts: ArchivedContactEntry[]
  findById: (id: string) => ContactListItem | undefined
  addContact: (values: CreateContactFormValues) => Promise<ContactListItem>
  addContacts: (values: CreateContactFormValues[]) => Promise<ContactListItem[]>
  updateContactFromDetail: (detail: ContactDetail) => Promise<ContactDetail>
  logContactOutreach: (
    contact: ContactListItem,
    form: ContactOutreachFormValues,
    author: string,
    addActivity: (
      values: import('@/lib/activity-create').CreateActivityFormValues,
    ) => Promise<ActivityListItem>,
  ) => Promise<LogContactOutreachPayload>
  archiveContact: (id: string) => Promise<void>
  archiveContacts: (ids: string[]) => Promise<void>
  restoreContact: (id: string) => Promise<void>
  restoreContacts: (ids: string[]) => Promise<void>
  permanentlyDeleteContact: (id: string) => Promise<void>
  permanentlyDeleteContacts: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const ContactsRegistryContext =
  createContext<ContactsRegistryContextValue | null>(null)
