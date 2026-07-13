import { useEffect, useState } from 'react'
import { Cake, Gift, PartyPopper, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EntityAvatarImage } from '@/components/shared/EntityAvatarImage'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { WelcomeSectionLabel } from '@/components/welcome/WelcomePageBackdrop'
import { isApiEnabled } from '@/api/config'
import {
  listTenantBirthdaysApi,
  type TenantBirthdayItem,
} from '@/api/users'
import { chilePartsFromDate } from '@/lib/chile-timezone'
import { getUserDetailPath } from '@/lib/user-routes'
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

function BirthdayAvatar({ person }: { person: BirthdayPerson }) {
  return (
    <Avatar className="size-9 border border-border/60 shadow-sm">
      {person.avatarUrl ? (
        <EntityAvatarImage src={person.avatarUrl} alt={person.name} />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
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

  return (
    <div className="space-y-4">
      {hasTodayCelebration ? (
        <section
          className={cn(
            'relative overflow-hidden rounded-[1.5rem] border px-5 py-5 shadow-sm sm:px-6',
            'border-amber-300/60 bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50',
            'dark:border-amber-500/30 dark:from-amber-950/40 dark:via-rose-950/30 dark:to-sky-950/30',
          )}
          aria-live="polite"
        >
          <div
            className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-amber-200/40 blur-2xl dark:bg-amber-400/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 left-8 size-24 rounded-full bg-rose-200/40 blur-2xl dark:bg-rose-400/10"
            aria-hidden
          />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <PartyPopper aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 space-y-1.5">
                {isCurrentUserBirthday ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
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
                      también lo celebra contigo.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      <Sparkles aria-hidden className="size-3.5" />
                      Cumpleaños de hoy
                    </p>
                    <h2 className="text-balance text-lg font-bold tracking-tight text-foreground sm:text-xl">
                      {buildBirthdayReminderMessage(todayColleagueBirthdays)}
                    </h2>
                  </>
                )}
                {isCurrentUserBirthday && todayColleagueBirthdays.length > 0 ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {buildBirthdayReminderMessage(todayColleagueBirthdays)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {(isCurrentUserBirthday
                ? items.filter((p) => p.id === currentUserId)
                : []
              )
                .concat(todayColleagueBirthdays)
                .map((person) => (
                  <Link
                    key={person.id}
                    to={getUserDetailPath(person.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-background/80 py-1 pe-3 ps-1 text-sm font-medium text-foreground shadow-sm backdrop-blur hover:bg-background"
                  >
                    <BirthdayAvatar person={person} />
                    <span className="max-w-[10rem] truncate">{person.name}</span>
                    <Gift aria-hidden className="size-3.5 text-amber-600" />
                  </Link>
                ))}
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,#f59e0b,#f43f5e,#38bdf8,#f59e0b)] bg-[length:200%_100%] opacity-80"
            aria-hidden
          />
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
                <li key={person.id}>
                  <Link
                    to={getUserDetailPath(person.id)}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40',
                      today && 'bg-amber-50/70 dark:bg-amber-950/20',
                    )}
                  >
                    <BirthdayAvatar person={person} />
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                        <PartyPopper aria-hidden className="size-3" />
                        Hoy
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
