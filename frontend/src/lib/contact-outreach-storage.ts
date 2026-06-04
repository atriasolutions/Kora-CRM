import { STORAGE_PREFIX } from '@/config/brand'
import type { ContactListItem } from '@/data/contacts.mock'
import type {
  ContactOutreachResult,
  ContactReachabilityStatus,
} from '@/lib/contact-outreach'
import type { ContactActivityType } from '@/data/contact-detail.mock'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-contact-outreach`

export type StoredContactOutreach = {
  lastOutreachAt: string
  lastOutreachChannel: ContactActivityType
  lastOutreachResult: ContactOutreachResult
  reachabilityStatus: ContactReachabilityStatus
  outreachAttemptCount: number
  lastContactLabel: string
  lastOutreachLabel: string
}

function loadStore(): Record<string, StoredContactOutreach> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StoredContactOutreach>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, StoredContactOutreach>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

export function persistContactOutreachSnapshot(
  contactId: string,
  contact: Pick<
    ContactListItem,
    | 'lastOutreachAt'
    | 'lastOutreachChannel'
    | 'lastOutreachResult'
    | 'reachabilityStatus'
    | 'outreachAttemptCount'
    | 'lastContactLabel'
    | 'lastOutreachLabel'
  >,
) {
  if (
    !contact.lastOutreachAt ||
    !contact.lastOutreachChannel ||
    !contact.lastOutreachResult
  ) {
    return
  }
  const store = loadStore()
  store[contactId] = {
    lastOutreachAt: contact.lastOutreachAt,
    lastOutreachChannel: contact.lastOutreachChannel,
    lastOutreachResult: contact.lastOutreachResult,
    reachabilityStatus: contact.reachabilityStatus ?? 'unknown',
    outreachAttemptCount: contact.outreachAttemptCount ?? 1,
    lastContactLabel: contact.lastContactLabel,
    lastOutreachLabel:
      contact.lastOutreachLabel ?? contact.lastContactLabel,
  }
  saveStore(store)
}

export function removeContactOutreachSnapshot(contactId: string) {
  const store = loadStore()
  if (!store[contactId]) return
  delete store[contactId]
  saveStore(store)
}

export function mergeOutreachIntoContact(contact: ContactListItem): ContactListItem {
  const stored = loadStore()[contact.id]
  if (!stored) return contact
  return {
    ...contact,
    ...stored,
  }
}

export function mergeOutreachIntoContacts(contacts: ContactListItem[]): ContactListItem[] {
  return contacts.map(mergeOutreachIntoContact)
}
