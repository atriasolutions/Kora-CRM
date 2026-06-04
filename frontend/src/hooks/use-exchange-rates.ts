import { useEffect, useState } from 'react'

import { getExchangeRatesTodayApi } from '@/api/exchange-rates'
import { isApiEnabled } from '@/api/config'
import type { ExchangeRateSnapshot } from '@/lib/currency'

const defaultRates: ExchangeRateSnapshot = {
  rateDate: new Date().toISOString().slice(0, 10),
  ufClp: 0,
  usdClp: 0,
  eurClp: 0,
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRateSnapshot>(defaultRates)
  const [loading, setLoading] = useState(isApiEnabled())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoading(false)
      return
    }

    let cancelled = false
    void getExchangeRatesTodayApi()
      .then((data) => {
        if (!cancelled) {
          setRates(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las tasas')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { rates, loading, error }
}
