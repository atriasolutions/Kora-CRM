import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import {
  computeWorkMetrics,
  fetchProjectWorkPlan,
  flushProjectWorkPlan,
  persistProjectWorkPlan,
  type WorkPlanPersistOptions,
} from '@/lib/project-work-plan'
import { toast } from '@/lib/toast'
import type { ProjectWorkPlan } from '@/types/project-work-plan'

export function useProjectWorkPlan(projectId: string | undefined) {
  const [plan, setPlan] = useState<ProjectWorkPlan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) {
      queueMicrotask(() => {
        setPlan(null)
        setLoading(false)
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => setLoading(true))

    fetchProjectWorkPlan(projectId)
      .then((loaded) => {
        if (!cancelled) setPlan(loaded)
      })
      .catch((error) => {
        if (!cancelled) {
          setPlan({ groups: [], items: [] })
          if (isApiEnabled()) {
            toast.error(
              apiActionErrorMessage(
                error,
                'No se pudo cargar el plan de trabajo del proyecto.',
              ),
            )
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId || !isApiEnabled()) return

    const flush = () => {
      void flushProjectWorkPlan(projectId).catch((error) => {
        toast.error(
          apiActionErrorMessage(error, 'No se pudo guardar el plan de trabajo.'),
        )
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [projectId])

  const persist = useCallback(
    (next: ProjectWorkPlan, options?: WorkPlanPersistOptions) => {
      if (!projectId) return
      setPlan(next)
      persistProjectWorkPlan(projectId, next, options)
    },
    [projectId],
  )

  const metrics = useMemo(() => (plan ? computeWorkMetrics(plan) : null), [plan])

  return { plan, setPlan: persist, metrics, loading }
}
