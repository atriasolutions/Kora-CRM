import { useEffect, useState } from 'react'

/** Pausa animaciones decorativas cuando la pestaña no está visible. */
export function useMarketingTabActive() {
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible',
  )

  useEffect(() => {
    const onChange = () => setActive(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return active
}

/** Pausa animaciones cuando el elemento sale del viewport. */
export function useInViewportPause<T extends HTMLElement>() {
  const [ref, setRef] = useState<T | null>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin: '80px 0px', threshold: 0 },
    )

    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref])

  return { setRef, inView }
}
