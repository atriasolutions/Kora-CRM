import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

type MarketingRevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

export function MarketingReveal({ children, className, delay = 0 }: MarketingRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('marketing-reveal', visible && 'marketing-reveal--visible', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
