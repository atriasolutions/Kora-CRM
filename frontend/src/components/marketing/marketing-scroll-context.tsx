import { createContext, useContext, type RefObject } from 'react'

export const MarketingScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

export function useMarketingScrollContainer() {
  return useContext(MarketingScrollContext)
}
