import { MarketingImageSlot } from '@/components/marketing/MarketingImageSlot'
import type { MarketingAssetSpec } from '@/lib/marketing-assets'
import { cn } from '@/lib/utils'

type MarketingHeroScreenshotProps = {
  asset: MarketingAssetSpec
  className?: string
  priority?: boolean
}

/** Pantallazo en hero: marco tipo navegador, imagen a ancho completo sin bandas vacías. */
export function MarketingHeroScreenshot({
  asset,
  className,
  priority = true,
}: MarketingHeroScreenshotProps) {
  return (
    <figure
      className={cn('relative w-full max-w-[40rem]', className)}
    >
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.35)_0%,transparent_70%)] opacity-80"
        aria-hidden
      />

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-white/20 bg-[#eef1f6]',
          'shadow-[0_32px_64px_-24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)]',
        )}
      >
        <div
          className="flex items-center gap-2 border-b border-black/[0.06] bg-[#e4e7ec] px-3 py-2.5 sm:px-4"
          aria-hidden
        >
          <span className="size-2.5 rounded-full bg-[#ff5f57] sm:size-3" />
          <span className="size-2.5 rounded-full bg-[#febc2e] sm:size-3" />
          <span className="size-2.5 rounded-full bg-[#28c840] sm:size-3" />
          <span className="mx-auto max-w-[12rem] truncate rounded-md bg-white/80 px-3 py-1 text-[10px] font-medium text-slate-500 sm:max-w-none sm:text-xs">
            koracrm.cl · Espacio de trabajo
          </span>
        </div>

        <MarketingImageSlot
          asset={asset}
          priority={priority}
          showFileHint={false}
          fit="natural"
          className="block w-full"
          imageClassName="block h-auto w-full"
        />
      </div>
    </figure>
  )
}
