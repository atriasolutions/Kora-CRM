import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveExpenseApi,
  createExpenseApi,
  expenseDetailToApiBody,
  expenseFormToApiBody,
  listExpensesApi,
  permanentlyDeleteExpenseApi,
  patchExpenseStatusApi,
  restoreExpenseApi,
  updateExpenseApi,
} from '@/api/expenses'
import {
  ExpensesRegistryContext,
  type ArchivedExpenseEntry,
} from '@/contexts/expenses-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import {
  getExpenseDetail,
  resolveExpenseListItem,
  type ExpenseDetail,
  type ExpenseListItem,
} from '@/data/expenses.mock'
import { syncRegistryExpenses } from '@/data/expenses-registry-store'
import {
  formValuesToExpenseListItem,
  type CreateExpenseFormValues,
} from '@/lib/expense-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromExpenseDetail } from '@/lib/expense-form'
import {
  type ArchivedExpenseStore,
  archivedExpenseIds,
  loadArchivedExpenseStore,
  purgeExpiredExpenseStore,
  saveArchivedExpenseStore,
} from '@/lib/expense-archive'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-expenses`

function purgeExpenseLocalData(expenseId: string) {
  const id = expenseId.trim()
  if (!id) return
  purgeEntityAttachments('gasto', id, 'gasto')
}

function loadStored(): ExpenseListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExpenseListItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persistLocal(expenses: ExpenseListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(id: string, userExpenses: ExpenseListItem[]): ExpenseListItem {
  const fromUser = userExpenses.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolveExpenseListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedExpenseStore,
  userExpenses: ExpenseListItem[],
): ArchivedExpenseEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      expense: record.snapshot ?? snapshotForArchive(record.id, userExpenses),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function ExpensesRegistryProvider({ children }: { children: ReactNode }) {
  const [userExpenses, setUserExpenses] = useState<ExpenseListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStored()
    syncRegistryExpenses(loaded)
    return loaded
  })

  const [archiveStore, setArchiveStore] = useState<ArchivedExpenseStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedExpenseStore()
    const { store } = purgeExpiredExpenseStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedExpenseStore(store)
    }
    return store
  })

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listExpensesApi(false),
      listExpensesApi(true),
    ])
    syncRegistryExpenses(active)
    setUserExpenses(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'gastos' })

  const archivedIds = useMemo(() => archivedExpenseIds(archiveStore), [archiveStore])

  const save = useCallback((next: ExpenseListItem[]) => {
    syncRegistryExpenses(next)
    setUserExpenses(next)
    if (!useApi) persistLocal(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedExpenseStore) => {
    if (!useApi) saveArchivedExpenseStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userExpenses.find((o) => o.id === id),
    [userExpenses],
  )

  const addExpense = useCallback(
    async (values: CreateExpenseFormValues) => {
      if (useApi) {
        const detail = await createExpenseApi(expenseFormToApiBody(values))
        const item = listItemFromExpenseDetail(detail)
        save([item, ...userExpenses])
        return item
      }
      const item = formValuesToExpenseListItem(values)
      save([item, ...userExpenses])
      return item
    },
    [save, userExpenses],
  )

  const isArchived = useCallback((id: string) => archivedIds.has(id), [archivedIds])

  const updateExpenseFromDetail = useCallback(
    async (detail: ExpenseDetail) => {
      const list = listItemFromExpenseDetail(detail)
      if (useApi) {
        await updateExpenseApi(detail.id, expenseDetailToApiBody(detail))
        if (userExpenses.some((o) => o.id === detail.id)) {
          save(userExpenses.map((o) => (o.id === detail.id ? list : o)))
        }
        return
      }
      if (userExpenses.some((o) => o.id === detail.id)) {
        save(userExpenses.map((o) => (o.id === detail.id ? list : o)))
      }
    },
    [save, userExpenses],
  )

  const patchExpenseStatus = useCallback(
    async (id: string, status: string) => {
      if (useApi) {
        const detail = await patchExpenseStatusApi(id, { status })
        const list = listItemFromExpenseDetail(detail)
        if (userExpenses.some((o) => o.id === id)) {
          save(userExpenses.map((o) => (o.id === id ? list : o)))
        }
        return detail
      }
      const current = userExpenses.find((o) => o.id === id)
      if (!current) throw new Error('Gasto no encontrado')
      const detail: ExpenseDetail = {
        ...getExpenseDetail(id),
        ...current,
        status: status as ExpenseDetail['status'],
        internalNotes: current.notes ?? '',
        activities: [],
        notes: [],
        files: [],
      }
      await updateExpenseFromDetail(detail)
      return detail
    },
    [save, updateExpenseFromDetail, userExpenses],
  )

  const archiveExpense = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveExpenseApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userExpenses.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedExpenseStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userExpenses) },
      }
      persistArchive(next)
      save(userExpenses.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userExpenses],
  )

  const archiveExpenses = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveExpense(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedExpenseStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userExpenses),
        }
      }
      persistArchive(next)
      save(userExpenses.filter((o) => !unique.includes(o.id)))
    },
    [archiveExpense, archiveStore, archivedIds, persistArchive, save, userExpenses],
  )

  const restoreExpense = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreExpenseApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userExpenses.some((o) => o.id === id)) save([item, ...userExpenses])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userExpenses),
      )
      if (!userExpenses.some((o) => o.id === id)) save([item, ...userExpenses])
    },
    [archiveStore, persistArchive, save, userExpenses],
  )

  const restoreExpenses = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreExpense(id)
    },
    [restoreExpense],
  )

  const permanentlyDeleteExpense = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeleteExpenseApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgeExpenseLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteExpenses = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) {
          await permanentlyDeleteExpenseApi(id)
        }
        delete nextStore[id]
        purgeExpenseLocalData(id)
      }
      persistArchive(nextStore)
    },
    [archiveStore, persistArchive],
  )

  useEffect(() => {
    if (useApi) return
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredExpenseStore(archiveStore)
      if (purgedIds.length === 0) return
      saveArchivedExpenseStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeExpenseLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allExpenses = useMemo(
    () => userExpenses.filter((o) => !archivedIds.has(o.id)),
    [userExpenses, archivedIds],
  )

  const archivedExpenses = useMemo(
    () => entriesFromStore(archiveStore, userExpenses),
    [archiveStore, userExpenses],
  )

  const value = useMemo(
    () => ({
      userExpenses,
      allExpenses,
      archivedExpenses,
      findById,
      addExpense,
      updateExpenseFromDetail,
      patchExpenseStatus,
      archiveExpense,
      archiveExpenses,
      restoreExpense,
      restoreExpenses,
      permanentlyDeleteExpense,
      permanentlyDeleteExpenses,
      isArchived,
      reloadFromApi,
    }),
    [
      userExpenses,
      allExpenses,
      archivedExpenses,
      findById,
      addExpense,
      updateExpenseFromDetail,
      patchExpenseStatus,
      archiveExpense,
      archiveExpenses,
      restoreExpense,
      restoreExpenses,
      permanentlyDeleteExpense,
      permanentlyDeleteExpenses,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <ExpensesRegistryContext.Provider value={value}>
      {children}
    </ExpensesRegistryContext.Provider>
  )
}
