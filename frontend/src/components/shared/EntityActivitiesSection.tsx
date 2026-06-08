import { ContactActivitiesPanel } from '@/components/contacts/ContactActivitiesPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContactActivity } from '@/data/contact-detail.mock'

export type EntityActivityKind =
  | 'contacto'
  | 'empresa'
  | 'compra'
  | 'inventario'
  | 'oportunidad'
  | 'cotizacion'
  | 'factura'
  | 'proyecto'
  | 'solicitud'
  | 'ingreso'
  | 'producto'

type EntityActivitiesSectionProps = {
  activities: ContactActivity[]
  entityKind: EntityActivityKind
  onRegister?: () => void
}

export function EntityActivitiesSection({
  activities,
  entityKind,
  onRegister,
}: EntityActivitiesSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Actividades</CardTitle>
        {onRegister ? (
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={onRegister}
          >
            Registrar actividad
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <ContactActivitiesPanel
          activities={activities}
          entityKind={entityKind}
          onRegister={onRegister}
        />
      </CardContent>
    </Card>
  )
}
