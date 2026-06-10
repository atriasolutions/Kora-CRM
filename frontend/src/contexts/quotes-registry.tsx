import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import { isRecordNotFoundError } from '@/api/errors'
import {
  archiveQuoteApi,
  createQuoteApi,
  deleteQuoteApi,
  listQuotesApi,
  quoteDetailToApiBody,
  quoteFormToApiBody,
  restoreQuoteApi,
  updateQuoteApi,
} from '@/api/quotes'
import {
  QuotesRegistryContext,
  type ArchivedQuoteEntry,
} from '@/contexts/quotes-registry-context'
import { resolveQuoteListItem } from '@/data/quote-detail.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { syncRegistryQuotes } from '@/data/quotes-registry-store'
import { formValuesToListItem, type CreateQuoteFormValues } from '@/lib/quote-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { normalizeQuoteDetailFromApi } from '@/lib/quote-detail-normalize'
import { listItemFromQuoteDetail } from '@/lib/quote-form'
import {
  type ArchivedQuoteStore,
  archivedQuoteIds,
  purgeExpiredFromStore,
} from '@/lib/quote-archive'
import { purgeQuoteLocalData } from '@/lib/quote-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()

function snapshotForArchive(id: string, userQuotes: QuoteListItem[]): QuoteListItem {
  const fromUser = userQuotes.find((q) => q.id === id)
  const base = fromUser ? { ...fromUser } : resolveQuoteListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedQuoteStore,
  userQuotes: QuoteListItem[],
): ArchivedQuoteEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      quote: record.snapshot ?? snapshotForArchive(record.id, userQuotes),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function QuotesRegistryProvider({ children }: { children: ReactNode }) {
  const [userQuotes, setUserQuotes] = useState<QuoteListItem[]>([])

  const [archiveStore, setArchiveStore] = useState<ArchivedQuoteStore>({})

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listQuotesApi(false),
      listQuotesApi(true),
    ])
    syncRegistryQuotes(active)
    setUserQuotes(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedQuoteIds(archiveStore), [archiveStore])

  const save = useCallback((next: QuoteListItem[]) => {
    syncRegistryQuotes(next)
    setUserQuotes(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedQuoteStore) => {
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userQuotes.find((q) => q.id === id),
    [userQuotes],
  )

  const addQuote = useCallback(
    async (values: CreateQuoteFormValues) => {
      if (useApi) {
        const item = await createQuoteApi(quoteFormToApiBody(values))
        save([item, ...userQuotes])
        return item
      }
      const item = formValuesToListItem(values)
      save([item, ...userQuotes])
      return item
    },
    [save, userQuotes],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateQuoteFromDetail = useCallback(
    async (
      detail: QuoteDetail,
      options?: { previousStatus?: string },
    ): Promise<QuoteDetail> => {
      const list = listItemFromQuoteDetail(detail)
      if (useApi) {
        const updated = await updateQuoteApi(
          detail.id,
          quoteDetailToApiBody(detail, options),
        )
        const normalized = normalizeQuoteDetailFromApi({
          ...detail,
          ...(updated as QuoteDetail),
          lineItems: (updated as QuoteDetail).lineItems ?? detail.lineItems,
        })
        save(
          userQuotes.map((q) =>
            q.id === detail.id ? listItemFromQuoteDetail(normalized) : q,
          ),
        )
        return normalized
      }
      if (userQuotes.some((q) => q.id === detail.id)) {
        save(userQuotes.map((q) => (q.id === detail.id ? list : q)))
      }
      return detail
    },
    [save, userQuotes],
  )

  const archiveQuote = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveQuoteApi(id)
        const next: ArchivedQuoteStore = {
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        }
        persistArchive(next)
        save(userQuotes.filter((q) => q.id !== id))
        return
      }
      const snapshot = snapshotForArchive(id, userQuotes)
      const next: ArchivedQuoteStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot },
      }
      persistArchive(next)
      const nextUser = userQuotes.filter((q) => q.id !== id)
      if (nextUser.length !== userQuotes.length) save(nextUser)
    },
    [archiveStore, archivedIds, persistArchive, save, userQuotes],
  )

  const archiveQuotes = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (archivedIds.has(id)) continue
          await archiveQuote(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedQuoteStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = { id, archivedAt: now, snapshot: snapshotForArchive(id, userQuotes) }
      }
      persistArchive(next)
      const idSet = new Set(unique)
      save(userQuotes.filter((q) => !idSet.has(q.id)))
    },
    [archiveQuote, archiveStore, archivedIds, persistArchive, save, userQuotes],
  )

  const purgeArchivedQuoteLocally = useCallback(
    (id: string) => {
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      save(userQuotes.filter((q) => q.id !== id))
      purgeQuoteLocalData(id)
    },
    [archiveStore, persistArchive, save, userQuotes],
  )

  const restoreQuote = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record) return
      if (useApi) {
        try {
          const item = await restoreQuoteApi(id)
          const next = { ...archiveStore }
          delete next[id]
          persistArchive(next)
          if (!userQuotes.some((q) => q.id === id)) save([item, ...userQuotes])
        } catch (error) {
          if (isRecordNotFoundError(error)) {
            purgeArchivedQuoteLocally(id)
            return
          }
          throw error
        }
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record.snapshot ?? snapshotForArchive(id, userQuotes))
      if (!userQuotes.some((q) => q.id === id)) save([item, ...userQuotes])
    },
    [archiveStore, persistArchive, purgeArchivedQuoteLocally, save, userQuotes],
  )

  const restoreQuotes = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          await restoreQuote(id)
        }
        return
      }
      const nextStore = { ...archiveStore }
      const toRestore: QuoteListItem[] = []
      for (const id of unique) {
        const record = nextStore[id]
        if (!record) continue
        delete nextStore[id]
        const item = stampRecordAuditOnUpdate(
          record.snapshot ?? snapshotForArchive(id, userQuotes),
        )
        if (!userQuotes.some((q) => q.id === id) && !toRestore.some((q) => q.id === id)) {
          toRestore.push(item)
        }
      }
      persistArchive(nextStore)
      if (toRestore.length > 0) save([...toRestore, ...userQuotes])
    },
    [archiveStore, persistArchive, restoreQuote, save, userQuotes],
  )

  const permanentlyDeleteQuote = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        try {
          await deleteQuoteApi(id)
        } catch (error) {
          if (!isRecordNotFoundError(error)) throw error
        }
      }
      purgeArchivedQuoteLocally(id)
    },
    [archiveStore, purgeArchivedQuoteLocally],
  )

  const permanentlyDeleteQuotes = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        await Promise.all(
          unique.map(async (id) => {
            try {
              await deleteQuoteApi(id)
            } catch (error) {
              if (!isRecordNotFoundError(error)) throw error
            }
          }),
        )
      }
      const nextStore = { ...archiveStore }
      const idSet = new Set(unique)
      for (const id of unique) {
        if (nextStore[id]) {
          delete nextStore[id]
          purgeQuoteLocalData(id)
        }
      }
      persistArchive(nextStore)
      save(userQuotes.filter((q) => !idSet.has(q.id)))
    },
    [archiveStore, persistArchive, save, userQuotes],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeQuoteLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allQuotes = useMemo(
    () =>
      userQuotes.filter(
        (q) => !archivedIds.has(q.id),
      ),
    [userQuotes, archivedIds],
  )

  const archivedQuotes = useMemo(
    () => entriesFromStore(archiveStore, userQuotes),
    [archiveStore, userQuotes],
  )

  const quotesForOpportunity = useCallback(
    (opportunityId: string) =>
      allQuotes.filter((q) => q.opportunityId === opportunityId),
    [allQuotes],
  )

  const value = useMemo(
    () => ({
      userQuotes,
      allQuotes,
      archivedQuotes,
      findById,
      addQuote,
      updateQuoteFromDetail,
      archiveQuote,
      archiveQuotes,
      restoreQuote,
      restoreQuotes,
      permanentlyDeleteQuote,
      permanentlyDeleteQuotes,
      isArchived,
      quotesForOpportunity,
      reloadFromApi,
    }),
    [
      userQuotes,
      allQuotes,
      archivedQuotes,
      findById,
      addQuote,
      updateQuoteFromDetail,
      archiveQuote,
      archiveQuotes,
      restoreQuote,
      restoreQuotes,
      permanentlyDeleteQuote,
      permanentlyDeleteQuotes,
      isArchived,
      quotesForOpportunity,
      reloadFromApi,
    ],
  )

  return (
    <QuotesRegistryContext.Provider value={value}>{children}</QuotesRegistryContext.Provider>
  )
}
