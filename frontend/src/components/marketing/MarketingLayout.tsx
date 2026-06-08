import { useEffect, useRef, type RefObject } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingHeader'
import { MarketingScrollContext } from '@/components/marketing/marketing-scroll-context'
import { useMarketingTabActive } from '@/hooks/use-marketing-motion'
import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

function MarketingScrollToTop({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const { pathname } = useLocation()
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, left: 0 })
  }, [pathname, containerRef])
  return null
}

export function MarketingLayout() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const tabActive = useMarketingTabActive()

  return (
    <MarketingScrollContext.Provider value={scrollRef}>
      <div
        ref={scrollRef}
        className={cn(
          'marketing-scroll relative h-svh max-h-svh min-h-0 overflow-x-hidden overflow-y-auto scroll-smooth',
          marketingTheme.pageCanvas,
          tabActive ? 'marketing-tab-active' : 'marketing-tab-hidden',
        )}
      >
        <MarketingScrollToTop containerRef={scrollRef} />
        <MarketingHeader />
        <main>
          <Outlet />
        </main>
        <MarketingFooter />
      </div>
    </MarketingScrollContext.Provider>
  )
}
