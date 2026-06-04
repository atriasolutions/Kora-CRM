import type { ContactListItem } from '@/data/contacts.mock'

let registrySnapshot: ContactListItem[] = []

export function syncRegistryContacts(contacts: ContactListItem[]) {
  registrySnapshot = contacts
}

export function getRegistryContactById(id: string): ContactListItem | undefined {
  return registrySnapshot.find((c) => c.id === id)
}

export function getRegistryContacts(): ContactListItem[] {
  return registrySnapshot
}
