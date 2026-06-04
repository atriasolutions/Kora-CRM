import { useEffect, useRef } from 'react'

import type { ActivityListItem } from '@/data/activities.mock'
import { ACTIVITIES_UPDATED_EVENT } from '@/lib/realtime-events'
import {
  playActivityReminderSound,
  unlockActivityReminderAudio,
} from '@/lib/activity-reminder-sound'

type UseActivityReminderSoundOptions = {
  /** Esperar la carga inicial del registry antes de sincronizar IDs vistos. */
  registryHydrated: boolean
}

/**
 * Reproduce un sonido solo cuando un recordatorio nuevo llega vía WebSocket
 * (`activities:updated`), no al refrescar la página ni en cada tick del reloj.
 */
export function useActivityReminderSound(
  pendingActivities: ActivityListItem[],
  { registryHydrated }: UseActivityReminderSoundOptions,
): void {
  const seenDueIdsRef = useRef<Set<string>>(new Set())
  const initialSyncDoneRef = useRef(false)
  const wsRefreshPendingRef = useRef(false)

  useEffect(() => {
    unlockActivityReminderAudio()
  }, [])

  useEffect(() => {
    const onWsActivitiesUpdated = () => {
      wsRefreshPendingRef.current = true
    }
    window.addEventListener(ACTIVITIES_UPDATED_EVENT, onWsActivitiesUpdated)
    return () => {
      window.removeEventListener(ACTIVITIES_UPDATED_EVENT, onWsActivitiesUpdated)
    }
  }, [])

  useEffect(() => {
    if (!registryHydrated) return

    const currentIds = new Set(pendingActivities.map((a) => a.id))

    if (!initialSyncDoneRef.current) {
      seenDueIdsRef.current = currentIds
      initialSyncDoneRef.current = true
      wsRefreshPendingRef.current = false
      return
    }

    if (wsRefreshPendingRef.current) {
      const hasNewDue = pendingActivities.some(
        (activity) => !seenDueIdsRef.current.has(activity.id),
      )
      if (hasNewDue) {
        playActivityReminderSound()
      }
      seenDueIdsRef.current = currentIds
      wsRefreshPendingRef.current = false
      return
    }

    seenDueIdsRef.current = currentIds
  }, [pendingActivities, registryHydrated])
}
