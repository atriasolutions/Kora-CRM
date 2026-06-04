import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ModuleSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  className?: string
}

export function ModuleSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: ModuleSearchFieldProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={ariaLabel}
        className="h-8 w-full bg-background ps-9 shadow-none md:h-10 md:text-sm"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
