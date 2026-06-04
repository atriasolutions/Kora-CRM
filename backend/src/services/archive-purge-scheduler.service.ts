import { chileDateTimeParts } from '../lib/currency-conversion.js'
import { purgeExpiredArchivedRecords } from './archive-purge.service.js'

const CHECK_INTERVAL_MS = 60_000
const TARGET_HOUR = 0
const TARGET_MINUTE = 30

let checkTimer: ReturnType<typeof setInterval> | null = null
let lastPurgeDate: string | null = null
let purgeInFlight = false

function isPastDailyPurgeTime(hour: number, minute: number): boolean {
  return hour > TARGET_HOUR || (hour === TARGET_HOUR && minute >= TARGET_MINUTE)
}

export async function runScheduledArchivePurge(): Promise<void> {
  const { date } = chileDateTimeParts()
  if (lastPurgeDate === date || purgeInFlight) return

  purgeInFlight = true
  try {
    const result = await purgeExpiredArchivedRecords()
    lastPurgeDate = date
    if (result.totalPurged === 0 && result.totalFailed === 0) {
      console.log(`[archive-purge] Sin registros vencidos (${date}).`)
    }
  } finally {
    purgeInFlight = false
  }
}

function maybeRunScheduledPurge(): void {
  const { date, hour, minute } = chileDateTimeParts()
  if (lastPurgeDate === date || !isPastDailyPurgeTime(hour, minute)) return

  void runScheduledArchivePurge().catch((err) => {
    console.error('[archive-purge] error en purga programada:', err)
  })
}

export function startArchivePurgeScheduler(): void {
  if (checkTimer) return
  checkTimer = setInterval(maybeRunScheduledPurge, CHECK_INTERVAL_MS)
  maybeRunScheduledPurge()
}

export function stopArchivePurgeScheduler(): void {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}
