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

type HelpOverlayContextValue = {
  open: boolean
  showIndex: boolean
  openHelp: () => void
  openHelpIndex: () => void
  closeHelp: () => void
  toggleHelp: () => void
}

const HelpOverlayContext = createContext<HelpOverlayContextValue | null>(null)

export function HelpOverlayProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [showIndex, setShowIndex] = useState(false)
  const { pathname } = useLocation()

  const closeHelp = useCallback(() => {
    setOpen(false)
    setShowIndex(false)
  }, [])

  const openHelp = useCallback(() => {
    setShowIndex(false)
    setOpen(true)
  }, [])

  const openHelpIndex = useCallback(() => {
    setShowIndex(true)
    setOpen(true)
  }, [])

  const toggleHelp = useCallback(() => {
    setOpen((prev) => {
      if (prev) {
        setShowIndex(false)
        return false
      }
      setShowIndex(false)
      return true
    })
  }, [])

  useEffect(() => {
    closeHelp()
  }, [pathname, closeHelp])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      toggleHelp()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleHelp])

  const value = useMemo(
    () => ({
      open,
      showIndex,
      openHelp,
      openHelpIndex,
      closeHelp,
      toggleHelp,
    }),
    [open, showIndex, openHelp, openHelpIndex, closeHelp, toggleHelp],
  )

  return (
    <HelpOverlayContext.Provider value={value}>{children}</HelpOverlayContext.Provider>
  )
}

export function useHelpOverlay() {
  const ctx = useContext(HelpOverlayContext)
  if (!ctx) {
    throw new Error('useHelpOverlay debe usarse dentro de HelpOverlayProvider')
  }
  return ctx
}
