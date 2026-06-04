import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  archiveContactApi,
  contactDetailToApiBody,
  contactFormToApiBody,
  createContactApi,
  deleteContactApi,
  listContactsApi,
  restoreContactApi,
  updateContactApi,
} from '@/api/contacts'
import { isApiEnabled } from '@/api/config'
import {
  ContactsRegistryContext,
  type ArchivedContactEntry,
} from '@/contexts/contacts-registry-context'
import { resolveContactListItem } from '@/data/contact-detail.mock'
import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { syncRegistryContacts } from '@/data/contacts-registry-store'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { toast } from '@/lib/toast'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromContactDetail } from '@/lib/contact-form'
import { resolveRecordOwnerName } from '@/lib/owner-field'
import { formValuesToListItem } from '@/lib/contact-create'
import type { CreateContactFormValues } from '@/lib/contact-create'
import {
  type ArchivedContactStore,
  archivedContactIds,
  purgeExpiredFromStore,
} from '@/lib/contact-archive'
import { purgeContactLocalData } from '@/lib/contact-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import type { ActivityListItem } from '@/data/activities.mock'
import type { CreateActivityFormValues } from '@/lib/activity-create'
import {
  applyOutreachToContact,
  outreachFormToCreateValues,
  type ContactOutreachFormValues,
} from '@/lib/contact-outreach'
import {
  mergeOutreachIntoContact,
  mergeOutreachIntoContacts,
  persistContactOutreachSnapshot,
} from '@/lib/contact-outreach-storage'
import {
  cacheEntityListImage,
  mergeContactListAvatar,
  mergeListImagesIntoContacts,
} from '@/lib/entity-list-image-cache'
const useApi = isApiEnabled()

function snapshotForArchive(
  id: string,
  userContacts: ContactListItem[],
): ContactListItem {
  const fromUser = userContacts.find((c) => c.id === id)
  const base = fromUser ? { ...fromUser } : resolveContactListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedContactStore,
  userContacts: ContactListItem[],
): ArchivedContactEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      contact: record.snapshot ?? snapshotForArchive(record.id, userContacts),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

function denyContactCreate(): never {
  toast.error('No tienes permiso para crear contactos.')
  throw new Error('FORBIDDEN')
}

export function ContactsRegistryProvider({ children }: { children: ReactNode }) {
  const { can } = useMenuAccess()
  const [userContacts, setUserContacts] = useState<ContactListItem[]>([])

  const [archiveStore, setArchiveStore] = useState<ArchivedContactStore>({})

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listContactsApi(false),
      listContactsApi(true),
    ])
    syncRegistryContacts(active)
    setUserContacts(mergeListImagesIntoContacts(mergeOutreachIntoContacts(active)))
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedContactIds(archiveStore), [archiveStore])

  const save = useCallback((next: ContactListItem[]) => {
    syncRegistryContacts(next)
    setUserContacts(next)
  }, [])

  const logContactOutreach = useCallback(
    async (
      contact: ContactListItem,
      form: ContactOutreachFormValues,
      author: string,
      addActivity: (values: CreateActivityFormValues) => Promise<ActivityListItem>,
    ) => {
      const activityItem = await addActivity(
        outreachFormToCreateValues(contact, form, author),
      )
      const updatedContact = applyOutreachToContact(contact, form)
      persistContactOutreachSnapshot(contact.id, updatedContact)
      if (userContacts.some((c) => c.id === contact.id)) {
        save(
          userContacts.map((c) => (c.id === contact.id ? updatedContact : c)),
        )
      } else {
        save([updatedContact, ...userContacts])
      }
      return { updatedContact, activityItem }
    },
    [save, userContacts],
  )

  const persistArchive = useCallback((store: ArchivedContactStore) => {
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => {
      const row = userContacts.find((c) => c.id === id)
      return row
        ? mergeContactListAvatar(mergeOutreachIntoContact(row))
        : undefined
    },
    [userContacts],
  )

  const addContact = useCallback(
    async (values: CreateContactFormValues) => {
      if (useApi && !can('contactos', 'create')) denyContactCreate()
      if (useApi) {
        const item = await createContactApi(contactFormToApiBody(values))
        const list = mergeContactListAvatar({
          ...item,
          avatarUrl: values.avatarUrl?.trim() || item.avatarUrl,
        })
        cacheEntityListImage('contact', list.id, list.avatarUrl)
        save([list, ...userContacts])
        return list
      }
      const item = mergeContactListAvatar(formValuesToListItem(values))
      cacheEntityListImage('contact', item.id, item.avatarUrl)
      save([item, ...userContacts])
      return item
    },
    [can, save, userContacts],
  )

  const addContacts = useCallback(
    async (valuesList: CreateContactFormValues[]): Promise<ContactListItem[]> => {
      if (useApi && !can('contactos', 'create')) denyContactCreate()
      if (useApi) {
        const items = await Promise.all(
          valuesList.map(async (v) => {
            const item = await createContactApi(contactFormToApiBody(v))
            const list = mergeContactListAvatar({
              ...item,
              avatarUrl: v.avatarUrl?.trim() || item.avatarUrl,
            })
            cacheEntityListImage('contact', list.id, list.avatarUrl)
            return list
          }),
        )
        save([...items, ...userContacts])
        return items
      }
      const items = valuesList.map((v) => {
        const item = mergeContactListAvatar(formValuesToListItem(v))
        cacheEntityListImage('contact', item.id, item.avatarUrl)
        return item
      })
      save([...items, ...userContacts])
      return items
    },
    [can, save, userContacts],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateContactFromDetail = useCallback(
    async (detail: ContactDetail): Promise<ContactDetail> => {
      if (useApi) {
        const saved = await updateContactApi(detail.id, contactDetailToApiBody(detail))
        const ownerName = saved.ownerName?.trim() || resolveRecordOwnerName(detail)
        const merged: ContactDetail = {
          ...detail,
          ownerName,
          owner: {
            name: ownerName,
            avatarUrl:
              detail.owner.name === ownerName ? detail.owner.avatarUrl : undefined,
          },
          avatarUrl: saved.avatarUrl?.trim() || detail.avatarUrl,
        }
        cacheEntityListImage('contact', detail.id, merged.avatarUrl)
        const list = listItemFromContactDetail(merged)
        save(userContacts.map((c) => (c.id === detail.id ? list : c)))
        return merged
      }
      const list = listItemFromContactDetail(detail)
      cacheEntityListImage('contact', detail.id, list.avatarUrl)
      if (userContacts.some((c) => c.id === detail.id)) {
        save(userContacts.map((c) => (c.id === detail.id ? list : c)))
      }
      return detail
    },
    [save, userContacts],
  )

  const archiveContact = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveContactApi(id)
        const next: ArchivedContactStore = {
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        }
        persistArchive(next)
        save(userContacts.filter((c) => c.id !== id))
        return
      }
      const snapshot = snapshotForArchive(id, userContacts)
      const next: ArchivedContactStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot },
      }
      persistArchive(next)

      const nextUser = userContacts.filter((c) => c.id !== id)
      if (nextUser.length !== userContacts.length) {
        save(nextUser)
      }
    },
    [archiveStore, archivedIds, persistArchive, save, userContacts],
  )

  const archiveContacts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return

      if (useApi) {
        const now = Date.now()
        const next: ArchivedContactStore = { ...archiveStore }
        for (const id of unique) {
          if (next[id] || archivedIds.has(id)) continue
          const snapshot = await archiveContactApi(id)
          next[id] = { id, archivedAt: now, snapshot }
        }
        persistArchive(next)
        const idSet = new Set(unique)
        save(userContacts.filter((c) => !idSet.has(c.id)))
        return
      }

      const now = Date.now()
      const next: ArchivedContactStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userContacts),
        }
      }
      persistArchive(next)

      const idSet = new Set(unique)
      const nextUser = userContacts.filter((c) => !idSet.has(c.id))
      if (nextUser.length !== userContacts.length) {
        save(nextUser)
      }
    },
    [archiveStore, archivedIds, persistArchive, save, userContacts],
  )

  const restoreContact = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record) return

      if (useApi) {
        const item = await restoreContactApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userContacts.some((c) => c.id === id)) {
          save([item, ...userContacts])
        }
        return
      }

      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)

      const item = stampRecordAuditOnUpdate(
        record.snapshot ?? snapshotForArchive(id, userContacts),
      )
      if (!userContacts.some((c) => c.id === id)) {
        save([item, ...userContacts])
      }
    },
    [archiveStore, persistArchive, save, userContacts],
  )

  const restoreContacts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return

      if (useApi) {
        for (const id of unique) {
          if (archiveStore[id]) await restoreContactApi(id)
        }
      }

      const nextStore = { ...archiveStore }
      const toRestore: ContactListItem[] = []
      for (const id of unique) {
        const record = nextStore[id]
        if (!record) continue
        delete nextStore[id]
        const item = stampRecordAuditOnUpdate(
          record.snapshot ?? snapshotForArchive(id, userContacts),
        )
        if (
          !userContacts.some((c) => c.id === id) &&
          !toRestore.some((c) => c.id === id)
        ) {
          toRestore.push(item)
        }
      }
      persistArchive(nextStore)
      if (toRestore.length > 0) {
        save([...toRestore, ...userContacts])
      }
    },
    [archiveStore, persistArchive, save, userContacts],
  )

  const permanentlyDeleteContact = useCallback(
    async (id: string) => {
      if (useApi) {
        await deleteContactApi(id)
      } else if (!archiveStore[id]) {
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      save(userContacts.filter((c) => c.id !== id))
      purgeContactLocalData(id)
    },
    [archiveStore, persistArchive, save, userContacts],
  )

  const permanentlyDeleteContacts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        await Promise.all(unique.map((id) => deleteContactApi(id)))
      }
      const nextStore = { ...archiveStore }
      const idSet = new Set(unique)
      for (const id of unique) {
        if (nextStore[id]) {
          delete nextStore[id]
          purgeContactLocalData(id)
        }
      }
      persistArchive(nextStore)
      save(userContacts.filter((c) => !idSet.has(c.id)))
    },
    [archiveStore, persistArchive, save, userContacts],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeContactLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allContacts = useMemo(
    () =>
      mergeListImagesIntoContacts(
        mergeOutreachIntoContacts(
          userContacts.filter((c) => !archivedIds.has(c.id)),
        ),
      ),
    [userContacts, archivedIds],
  )

  const archivedContacts = useMemo(
    () => entriesFromStore(archiveStore, userContacts),
    [archiveStore, userContacts],
  )

  const value = useMemo(
    () => ({
      userContacts,
      allContacts,
      archivedContacts,
      findById,
      addContact,
      addContacts,
      updateContactFromDetail,
      logContactOutreach,
      archiveContact,
      archiveContacts,
      restoreContact,
      restoreContacts,
      permanentlyDeleteContact,
      permanentlyDeleteContacts,
      isArchived,
      reloadFromApi,
    }),
    [
      userContacts,
      allContacts,
      archivedContacts,
      findById,
      addContact,
      addContacts,
      updateContactFromDetail,
      logContactOutreach,
      archiveContact,
      archiveContacts,
      restoreContact,
      restoreContacts,
      permanentlyDeleteContact,
      permanentlyDeleteContacts,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <ContactsRegistryContext.Provider value={value}>
      {children}
    </ContactsRegistryContext.Provider>
  )
}
