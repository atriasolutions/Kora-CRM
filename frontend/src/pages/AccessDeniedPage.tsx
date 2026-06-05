import { ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { APP_HOME_PATH } from '@/lib/app-routes'

export function AccessDeniedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldOff aria-hidden className="size-12 text-muted-foreground" />
      <h1 className="text-lg font-semibold text-foreground">Sin acceso</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Tu perfil de acceso no incluye permiso para ver este menú. Contacta a un
        administrador si necesitas acceso.
      </p>
      <Button variant="outline" asChild>
        <Link to={APP_HOME_PATH}>Ir al inicio</Link>
      </Button>
    </div>
  )
}
