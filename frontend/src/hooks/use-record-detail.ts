import { useCallback, useEffect, useRef, useState } from 'react'

import {
  forbiddenErrorMessage,
  isForbiddenError,
  resolveRecordUnavailableReason,
} from '@/api/errors'
import type { RecordUnavailableReason } from '@/lib/record-module-meta'

export type RecordLoadState = 'loading' | 'ready' | 'unavailable'

type UseRecordDetailOptions<T> = {
  id: string | undefined
  load: (id: string) => Promise<T>
  isArchived?: (id: string) => boolean
  onLoaded?: (id: string, data: T) => void
  deps?: readonly unknown[]
}

export function useRecordDetail<T>({
  id,
  load,
  isArchived,
  onLoaded,
  deps = [],
}: UseRecordDetailOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loadState, setLoadState] = useState<RecordLoadState>('loading')
  const [reason, setReason] = useState<RecordUnavailableReason | null>(null)
  const [unavailableDetail, setUnavailableDetail] = useState<string | undefined>()
  const [reloadToken, setReloadToken] = useState(0)
  const onLoadedRef = useRef(onLoaded)
  const isArchivedRef = useRef(isArchived)

  onLoadedRef.current = onLoaded
  isArchivedRef.current = isArchived

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!id?.trim()) {
      setData(null)
      setLoadState('unavailable')
      setReason('invalid_id')
      setUnavailableDetail(undefined)
      return
    }

    if (isArchivedRef.current?.(id)) {
      setData(null)
      setLoadState('unavailable')
      setReason('archived')
      setUnavailableDetail(undefined)
      return
    }

    let cancelled = false
    setLoadState('loading')
    setReason(null)
    setUnavailableDetail(undefined)
    setData(null)

    void load(id)
      .then((record) => {
        if (cancelled) return
        setData(record)
        setLoadState('ready')
        onLoadedRef.current?.(id, record)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setData(null)
        setLoadState('unavailable')
        setReason(resolveRecordUnavailableReason(error))
        setUnavailableDetail(
          isForbiddenError(error) ? forbiddenErrorMessage(error) : undefined,
        )
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps ampliadas por el caller
  }, [id, load, reloadToken, ...deps])

  return { data, loadState, reason, unavailableDetail, reload }
}
