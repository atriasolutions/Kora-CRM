import { STORAGE_PREFIX } from '@/config/brand'
import type {
  InventoryLedger,
  StockMovementRecord,
  StockReservationRecord,
} from '@/lib/stock-types'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-stock-ledger`

export const STOCK_CHANGE_EVENT = 'kora-stock-change'

export type StockStoreSnapshot = {
  reservations: StockReservationRecord[]
  movements: StockMovementRecord[]
  ledgers: Record<string, InventoryLedger>
}

function emptyStore(): StockStoreSnapshot {
  return { reservations: [], movements: [], ledgers: {} }
}

function loadStore(): StockStoreSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as StockStoreSnapshot
    return {
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [],
      movements: Array.isArray(parsed.movements) ? parsed.movements : [],
      ledgers: parsed.ledgers && typeof parsed.ledgers === 'object' ? parsed.ledgers : {},
    }
  } catch {
    return emptyStore()
  }
}

function persistStore(store: StockStoreSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

let memoryStore: StockStoreSnapshot = loadStore()

export function getStockStore(): StockStoreSnapshot {
  return memoryStore
}

export function mutateStockStore(
  mutator: (store: StockStoreSnapshot) => StockStoreSnapshot,
): StockStoreSnapshot {
  memoryStore = mutator(structuredClone(memoryStore))
  persistStore(memoryStore)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STOCK_CHANGE_EVENT))
  }
  return memoryStore
}

export function reloadStockStoreFromDisk(): StockStoreSnapshot {
  memoryStore = loadStore()
  return memoryStore
}
