import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/components/ui/button'

/**
 * Registra el service worker y ofrece actualizar cuando hay una build nueva.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => {
        void registration.update().catch(() => {})
      }
      window.addEventListener('focus', check)
      window.setInterval(check, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 sm:p-4"
    >
      <div className="pointer-events-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
        <p className="flex-1 text-sm text-foreground">
          Hay una versión nueva de Kora disponible.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setNeedRefresh(false)}
          >
            Ahora no
          </Button>
          <Button type="button" size="sm" onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  )
}
