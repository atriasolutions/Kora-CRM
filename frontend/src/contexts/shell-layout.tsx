/* eslint-disable react-refresh/only-export-components -- context + hook en un solo archivo */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

import { STORAGE_PREFIX } from '@/config/brand'

const FEATURED_CONTACT_STORAGE_KEY = `${STORAGE_PREFIX}-featured-contact-open`

function readFeaturedContactOpen(): boolean {
  try {
    const stored = localStorage.getItem(FEATURED_CONTACT_STORAGE_KEY)
    if (stored === 'false') return false
    if (stored === 'true') return true
  } catch {
    /* ignore */
  }
  return true
}

type ShellLayoutContextValue = {
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  openMobileNav: () => void
  featuredContactOpen: boolean
  setFeaturedContactOpen: (open: boolean) => void
  toggleFeaturedContact: () => void
}

const ShellLayoutContext = createContext<ShellLayoutContextValue | null>(null)

export function ShellLayoutProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [featuredContactOpen, setFeaturedContactOpenState] = useState(
    readFeaturedContactOpen,
  )
  const location = useLocation()

  const setFeaturedContactOpen = useCallback((open: boolean) => {
    setFeaturedContactOpenState(open)
    try {
      localStorage.setItem(FEATURED_CONTACT_STORAGE_KEY, String(open))
    } catch {
      /* ignore */
    }
  }, [])

  const toggleFeaturedContact = useCallback(() => {
    setFeaturedContactOpenState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(FEATURED_CONTACT_STORAGE_KEY, String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    queueMicrotask(() => setMobileNavOpen(false))
  }, [location.pathname, location.search])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const collapse = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', collapse)
    queueMicrotask(collapse)
    return () => mq.removeEventListener('change', collapse)
  }, [])

  const openMobileNav = useCallback(() => setMobileNavOpen(true), [])

  const value = useMemo(
    (): ShellLayoutContextValue => ({
      mobileNavOpen,
      setMobileNavOpen,
      openMobileNav,
      featuredContactOpen,
      setFeaturedContactOpen,
      toggleFeaturedContact,
    }),
    [
      mobileNavOpen,
      openMobileNav,
      featuredContactOpen,
      setFeaturedContactOpen,
      toggleFeaturedContact,
    ],
  )

  return (
    <ShellLayoutContext.Provider value={value}>
      {children}
    </ShellLayoutContext.Provider>
  )
}

export function useShellLayout() {
  const ctx = useContext(ShellLayoutContext)
  if (!ctx)
    throw new Error('useShellLayout debe usarse dentro de ShellLayoutProvider')
  return ctx
}
