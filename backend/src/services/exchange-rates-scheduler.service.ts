import { chileDateTimeParts } from '../lib/currency-conversion.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import { syncExchangeRatesForDate } from './exchange-rates.service.js'

const CHECK_INTERVAL_MS = 60_000
const TARGET_HOUR = 0
const TARGET_MINUTE = 5

let checkTimer: ReturnType<typeof setInterval> | null = null
let lastSyncedDate: string | null = null
let syncInFlight = false

export async function runDailyExchangeRateSync(): Promise<void> {
  const { date } = chileDateTimeParts()
  if (lastSyncedDate === date || syncInFlight) return

  syncInFlight = true
  try {
    const snapshot = await runWithTenantAsync({ tenantId: ATRIA_TENANT_ID }, () =>
      syncExchangeRatesForDate(date),
    )
    lastSyncedDate = snapshot.rateDate
    console.log(
      `[exchange-rates] Tasas ${snapshot.rateDate} (${snapshot.source}): UF=${snapshot.ufClp} USD=${snapshot.usdClp} EUR=${snapshot.eurClp}`,
    )
  } finally {
    syncInFlight = false
  }
}

function maybeRunScheduledSync(): void {
  const { date, hour, minute } = chileDateTimeParts()
  if (lastSyncedDate === date) return

  // Catch-up: dispara una vez al día a partir de las 00:05 (hora Chile). Si el
  // tick exacto de las 00:05 se pierde (drift del timer o proceso ocupado),
  // cualquier tick posterior del día sincroniza igual, porque solo dependemos
  // de "aún no se ha sincronizado hoy".
  const reachedTarget =
    hour > TARGET_HOUR || (hour === TARGET_HOUR && minute >= TARGET_MINUTE)
  if (reachedTarget) {
    void runDailyExchangeRateSync().catch((err) => {
      console.error('[exchange-rates] error en sincronización programada:', err)
    })
  }
}

export function startExchangeRatesScheduler(): void {
  if (checkTimer) return

  void runDailyExchangeRateSync().catch((err) => {
    console.error('[exchange-rates] error en sincronización inicial:', err)
  })

  checkTimer = setInterval(maybeRunScheduledSync, CHECK_INTERVAL_MS)
}

export function stopExchangeRatesScheduler(): void {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}
