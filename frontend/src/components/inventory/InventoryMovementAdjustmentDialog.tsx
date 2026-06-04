import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InventoryMovementLine } from '@/data/inventory-detail.mock'
import {
  formatAdjustmentDetail,
  movementTypeBadgeLabel,
} from '@/lib/inventory-movement'

type InventoryMovementAdjustmentDialogProps = {
  movement: InventoryMovementLine | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryMovementAdjustmentDialog({
  movement,
  open,
  onOpenChange,
}: InventoryMovementAdjustmentDialogProps) {
  const detail = movement?.adjustmentDetail

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle del ajuste</DialogTitle>
          <DialogDescription>
            {movement ? movementTypeBadgeLabel(movement) : 'Ajuste de stock'}
          </DialogDescription>
        </DialogHeader>
        {movement && detail ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Modificación</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatAdjustmentDetail(detail)}
              </dd>
            </div>
            {detail.note ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Motivo</dt>
                <dd className="mt-0.5 text-foreground">{detail.note}</dd>
              </div>
            ) : movement.reference ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Referencia</dt>
                <dd className="mt-0.5 text-foreground">{movement.reference}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Registrado por</dt>
              <dd className="mt-0.5 text-foreground">{movement.author}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Fecha</dt>
              <dd className="mt-0.5 text-foreground">{movement.when}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Cantidad del movimiento</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">{movement.quantity}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Saldo resultante</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">{movement.balance}</dd>
            </div>
          </dl>
        ) : movement ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Referencia</dt>
              <dd className="mt-0.5 text-foreground">{movement.reference}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Registrado por</dt>
              <dd className="mt-0.5 text-foreground">{movement.author}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Fecha</dt>
              <dd className="mt-0.5 text-foreground">{movement.when}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Cantidad</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">{movement.quantity}</dd>
            </div>
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
