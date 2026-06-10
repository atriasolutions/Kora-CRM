import type { BadgeProps } from '@/components/ui/badge'

export type BitacoraBillableBadgeVariant = NonNullable<BadgeProps['variant']>

export function bitacoraBillableVariant(isBillable: boolean): BitacoraBillableBadgeVariant {
  return isBillable ? 'customer' : 'secondary'
}

export function bitacoraBillableLabel(isBillable: boolean): string {
  return isBillable ? 'Facturable' : 'No facturable'
}
