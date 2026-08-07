import { useEffect, useState } from 'react'

import { getExchangeRatesForDateApi } from '@/api/exchange-rates'
import { isApiEnabled } from '@/api/config'
import { chileDateString, type ExchangeRateSnapshot } from '@/lib/currency'
import { purchaseDisplayDateToInput } from '@/lib/purchase-dates'

const emptyRates = (date: string): ExchangeRateSnapshot => ({
  rateDate: date,
  ufClp: 0,
  usdClp: 0,
  eurClp: 0,
})

export function resolveExchangeRateIsoDate(displayOrIso: string): string {
  const trimmed = displayOrIso.trim()
  if (!trimmed) return chileDateString()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  return purchaseDisplayDateToInput(trimmed) || chileDateString()
}

export function useExchangeRatesForDate(displayOrIsoDate: string) {
  const isoDate = resolveExchangeRateIsoDate(displayOrIsoDate)
  const [rates, setRates] = useState<ExchangeRateSnapshot>(() => emptyRates(isoDate))
  const [loading, setLoading] = useState(isApiEnabled())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isApiEnabled()) {
      setRates(emptyRates(isoDate))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void getExchangeRatesForDateApi(isoDate)
      .then((data) => {
        if (!cancelled) {
          setRates(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las tasas')
          setRates(emptyRates(isoDate))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isoDate])

  return { rates, loading, error, isoDate }
}
