import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { MarketingImageSlot } from '@/components/marketing/MarketingImageSlot'
import { ScreenshotFrame } from '@/components/marketing/ScreenshotFrame'
import { Button } from '@/components/ui/button'
import {
  MARKETING_SCREENSHOTS,
  MARKETING_SCREENSHOT_CAPTIONS,
  type MarketingAssetSpec,
} from '@/lib/marketing-assets'
import { cn } from '@/lib/utils'

type ScreenshotShowcaseProps = {
  keys: ReadonlyArray<keyof typeof MARKETING_SCREENSHOTS>
  className?: string
  carouselOnMobile?: boolean
}

export function ScreenshotShowcase({
  keys,
  className,
  carouselOnMobile = true,
}: ScreenshotShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const items = keys.map((key) => ({
    key,
    asset: MARKETING_SCREENSHOTS[key],
    caption: MARKETING_SCREENSHOT_CAPTIONS[key],
  }))

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container) return
    const child = container.children[index] as HTMLElement | undefined
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setActiveIndex(index)
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container || container.children.length === 0) return
    const scrollLeft = container.scrollLeft
    const childWidth = (container.children[0] as HTMLElement).offsetWidth + 16
    const index = Math.round(scrollLeft / childWidth)
    setActiveIndex(Math.min(Math.max(index, 0), items.length - 1))
  }, [items.length])

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        onScroll={carouselOnMobile ? handleScroll : undefined}
        className={cn(
          carouselOnMobile
            ? 'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scroll-smooth lg:grid lg:grid-cols-2 lg:gap-8 lg:overflow-visible lg:pb-0'
            : 'grid gap-8 sm:grid-cols-2',
        )}
      >
        {items.map(({ key, asset, caption }, index) => (
          <div
            key={key}
            className={cn(
              carouselOnMobile && 'w-[85vw] shrink-0 snap-center sm:w-[70vw] lg:w-auto',
              carouselOnMobile &&
                activeIndex === index &&
                'lg:opacity-100 opacity-100',
            )}
          >
            <ScreenshotFrame caption={caption}>
              <MarketingImageSlot
                asset={asset}
                showFileHint={false}
                fit="natural"
                variant="light"
                className="w-full"
              />
            </ScreenshotFrame>
          </div>
        ))}
      </div>

      {carouselOnMobile && items.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Anterior"
            onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
            disabled={activeIndex === 0}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <div className="flex gap-2">
            {items.map((item, index) => (
              <button
                key={item.key}
                type="button"
                aria-label={`Ir a pantallazo ${index + 1}`}
                aria-current={activeIndex === index}
                onClick={() => scrollToIndex(index)}
                className={cn(
                  'size-2 rounded-full transition-all',
                  activeIndex === index
                    ? 'w-6 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Siguiente"
            onClick={() => scrollToIndex(Math.min(activeIndex + 1, items.length - 1))}
            disabled={activeIndex === items.length - 1}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function ScreenshotSingle({
  asset,
  caption,
  className,
}: {
  asset: MarketingAssetSpec
  caption?: string
  className?: string
}) {
  return (
    <ScreenshotFrame caption={caption} className={className}>
      <MarketingImageSlot asset={asset} showFileHint={false} fit="natural" variant="light" className="w-full" />
    </ScreenshotFrame>
  )
}
