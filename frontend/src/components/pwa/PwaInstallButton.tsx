import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

/**
 * En Chrome/Android muestra «Instalar app» cuando el navegador ofrece beforeinstallprompt.
 * En iOS Safari no hay ese evento: se usa «Compartir → Añadir a pantalla de inicio».
 */
export function PwaInstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setHidden(true)
      return
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setHidden(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (hidden || !deferred) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => {
        void (async () => {
          await deferred.prompt()
          const choice = await deferred.userChoice
          if (choice.outcome === 'accepted') setHidden(true)
          setDeferred(null)
        })()
      }}
    >
      <Download aria-hidden className="size-4" />
      Instalar app
    </Button>
  )
}
