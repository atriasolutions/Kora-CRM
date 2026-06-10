import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

import {
  SETTINGS_SECTIONS,
  type SettingsSection,
  type SettingsSectionId,
} from './settings-sections'

type SettingsNavProps = {
  activeId: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
}

function NavButton({
  section,
  active,
  onSelect,
}: {
  section: SettingsSection
  active: boolean
  onSelect: () => void
}) {
  const Icon = section.Icon
  const disabled = Boolean(section.comingSoon)

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-start gap-3 rounded-lg border border-dashed border-border/80 px-3 py-3 text-left opacity-60"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{section.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Próximamente
            </span>
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {section.description}
          </span>
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
        active
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-transparent hover:border-border hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md border',
          active
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border bg-muted/60 text-muted-foreground',
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground/90">{section.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {section.description}
        </span>
      </span>
    </button>
  )
}

export function SettingsNav({ activeId, onSelect }: SettingsNavProps) {
  const { session } = useAuth()
  const isPlatformOperator = Boolean(session?.isPlatformOperator)

  const sections = SETTINGS_SECTIONS.filter(
    (section) => !section.platformOperatorOnly || isPlatformOperator,
  )

  return (
    <nav aria-label="Secciones de configuración" className="space-y-1">
      {sections.map((section) => (
        <NavButton
          key={section.id}
          section={section}
          active={activeId === section.id}
          onSelect={() => onSelect(section.id)}
        />
      ))}
    </nav>
  )
}
