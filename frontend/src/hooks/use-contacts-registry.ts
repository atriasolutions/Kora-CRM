import { useContext } from 'react'

import { ContactsRegistryContext } from '@/contexts/contacts-registry-context'

export function useContactsRegistry() {
  const ctx = useContext(ContactsRegistryContext)
  if (!ctx) {
    throw new Error('useContactsRegistry debe usarse dentro de ContactsRegistryProvider')
  }
  return ctx
}
