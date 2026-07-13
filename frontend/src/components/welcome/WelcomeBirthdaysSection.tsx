import { useEffect, useState } from 'react'
import { Cake, Gift, PartyPopper, Sparkles } from 'lucide-react'

import { EntityAvatarImage } from '@/components/shared/EntityAvatarImage'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { WelcomeBirthdayEffects } from '@/components/welcome/WelcomeBirthdayEffects'
import { WelcomeSectionLabel } from '@/components/welcome/WelcomePageBackdrop'
import { isApiEnabled } from '@/api/config'
import {
  listTenantBirthdaysApi,
  type TenantBirthdayItem,
} from '@/api/users'
import { chilePartsFromDate } from '@/lib/chile-timezone'
import {
  buildBirthdayReminderMessage,
  firstNameOf,
  formatBirthdayDayLabel,
  isBirthdayToday,
  partitionTenantBirthdays,
  type BirthdayPerson,
} from '@/lib/tenant-birthdays'
import { cn } from '@/lib/utils'

type WelcomeBirthdaysSectionProps = {
  currentUserId?: string
  currentUserName?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function BirthdayAvatar({
  person,
  highlight = false,
  size = 'md',
}: {
  person: BirthdayPerson
  highlight?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <Avatar
      className={cn(
        'shrink-0 border shadow-sm',
        size === 'lg' ? 'size-12' : 'size-11',
        highlight ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border/60',
      )}
    >
      {person.avatarUrl ? (
        <EntityAvatarImage src={person.avatarUrl} alt={person.name} />
      ) : null}
      <AvatarFallback
        className={cn(
          'bg-primary/10 font-semibold text-primary',
          size === 'lg' ? 'text-sm' : 'text-xs',
        )}
      >
        {initials(person.name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function WelcomeBirthdaysSection({
  currentUserId,
  currentUserName,
}: WelcomeBirthdaysSectionProps) {
  const [items, setItems] = useState<TenantBirthdayItem[]>([])
  const [loaded, setLoaded] = useState(!isApiEnabled())

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoaded(true)
      return
    }
    let cancelled = false
    void listTenantBirthdaysApi()
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) return null

  const {
    monthBirthdays,
    todayColleagueBirthdays,
    isCurrentUserBirthday,
  } = partitionTenantBirthdays(items, currentUserId)

  const monthName = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    timeZone: 'America/Santiago',
  }).format(new Date())
  const hasTodayCelebration =
    isCurrentUserBirthday || todayColleagueBirthdays.length > 0

  const celebrants = (
    isCurrentUserBirthday
      ? items.filter((p) => p.id === currentUserId)
      : []
  ).concat(todayColleagueBirthdays)

  return (
    <div className="space-y-4">
      {hasTodayCelebration ? <WelcomeBirthdayEffects /> : null}

      {hasTodayCelebration ? (
        <section
          className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card px-5 py-5 shadow-sm sm:px-6 sm:py-6"
          aria-live="polite"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-chart-5/[0.06]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="birthday-pulse-icon grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <PartyPopper aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 space-y-2">
                {isCurrentUserBirthday ? (
                  <>
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      <Sparkles aria-hidden className="size-3.5" />
                      ¡Hoy es tu día!
                    </p>
                    <h2 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      Feliz cumpleaños,{' '}
                      <span className="welcome-name-gradient">
                        {firstNameOf(currentUserName ?? '')}
                      </span>
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Que tengas un excelente día. Tu equipo en esta instancia
                      también lo celebra contigo
                      {todayColleagueBirthdays.length > 0
                        ? ' — y no eres el único festejo de hoy.'
                        : '.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      <Sparkles aria-hidden className="size-3.5" />
                      Cumpleaños de hoy
                    </p>
                    <h2 className="text-balance text-lg font-bold tracking-tight text-foreground sm:text-xl">
                      {buildBirthdayReminderMessage(todayColleagueBirthdays)}
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Un saludo rápido les puede alegrar el día.
                    </p>
                  </>
                )}
                {isCurrentUserBirthday && todayColleagueBirthdays.length > 0 ? (
                  <p className="max-w-2xl rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm leading-relaxed text-foreground">
                    {buildBirthdayReminderMessage(todayColleagueBirthdays)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 sm:max-w-sm sm:justify-end">
              {celebrants.map((person) => (
                <div
                  key={person.id}
                  className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-background py-1.5 pe-4 ps-1.5 text-sm font-medium text-foreground shadow-sm"
                >
                  <BirthdayAvatar person={person} highlight size="lg" />
                  <span className="max-w-[11rem] truncate">{person.name}</span>
                  <Gift aria-hidden className="size-3.5 shrink-0 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/25 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Cake aria-hidden className="size-5" />
            </span>
            <div>
              <WelcomeSectionLabel>Equipo</WelcomeSectionLabel>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Cumpleaños del mes
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Celebraciones de {monthName} en tu instancia
              </p>
            </div>
          </div>
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {monthBirthdays.length}
          </span>
        </div>

        {monthBirthdays.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay cumpleaños registrados este mes.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrega la fecha de nacimiento en el perfil de cada usuario.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {monthBirthdays.map((person) => {
              const today = isBirthdayToday(person.birthDate)
              const day = chilePartsFromDate(new Date()).day
              const personDay = Number(person.birthDate.slice(8, 10))
              const isPast = personDay < day && !today
              return (
                <li
                  key={person.id}
                  className={cn(
                    'flex items-center gap-3.5 px-5 py-3.5',
                    today && 'bg-primary/[0.06]',
                  )}
                >
                  <BirthdayAvatar
                    person={person}
                    highlight={today}
                    size={today ? 'lg' : 'md'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {person.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBirthdayDayLabel(person.birthDate)}
                      {today ? ' · Hoy' : isPast ? ' · Ya celebrado' : ''}
                    </p>
                  </div>
                  {today ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.08] px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <PartyPopper aria-hidden className="size-3" />
                      Hoy
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
