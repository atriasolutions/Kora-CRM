/* eslint-disable react-refresh/only-export-components -- variantes CVA compartidas con shadcn/ui */
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        muted:
          'border-transparent bg-muted text-muted-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        proposal:
          'border-transparent bg-accent text-accent-foreground',
        negotiation:
          'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
        qualified:
          'border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        /** CRM contactos — Cliente (verde) */
        customer:
          'border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        prospect:
          'border-transparent bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
        lead:
          'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
        /** CRM — Proveedor (ámbar) */
        supplier:
          'border-transparent bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
        /** Tag estilo cliente en panel derecho */
        client:
          'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
