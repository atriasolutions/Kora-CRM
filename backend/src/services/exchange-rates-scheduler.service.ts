import { chileDateTimeParts } from '../lib/currency-conversion.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import { syncExchangeRatesForDate } from './exchange-rates.service.js'

const CHECK_INTERVAL_MS = 60_000
const TARGET_HOUR = 0
const TARGET_MINUTE = 5

let checkTimer: ReturnType<typeof setInterval> | null = null
let lastSyncedDate: string | null = null

export async function runDailyExchangeRateSync(): Promise<void> {
  const { date } = chileDateTimeParts()
  if (lastSyncedDate === date) return

  const snapshot = await runWithTenantAsync({ tenantId: ATRIA_TENANT_ID }, () =>
    syncExchangeRatesForDate(date),
  )
  lastSyncedDate = snapshot.rateDate
  console.log(
    `[exchange-rates] Tasas ${snapshot.rateDate}: UF=${snapshot.ufClp} USD=${snapshot.usdClp} EUR=${snapshot.eurClp}`,
  )
}

function maybeRunScheduledSync(): void {
  const { date, hour, minute } = chileDateTimeParts()
  if (hour === TARGET_HOUR && minute === TARGET_MINUTE && lastSyncedDate !== date) {
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
