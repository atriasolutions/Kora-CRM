import { useEffect, useState } from 'react'
import { Cake, Gift, PartyPopper, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EntityAvatarImage } from '@/components/shared/EntityAvatarImage'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { WelcomeBirthdayEffects } from '@/components/welcome/WelcomeBirthdayEffects'
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

function BirthdayAvatar({
  person,
  festive = false,
}: {
  person: BirthdayPerson
  festive?: boolean
}) {
  return (
    <Avatar
      className={cn(
        'size-9 border shadow-sm',
        festive
          ? 'border-white/80 ring-2 ring-[#ff6b9d]/50'
          : 'border-border/60',
      )}
    >
      {person.avatarUrl ? (
        <EntityAvatarImage src={person.avatarUrl} alt={person.name} />
      ) : null}
      <AvatarFallback
        className={cn(
          'text-[11px] font-semibold',
          festive
            ? 'bg-gradient-to-br from-[#ff6b9d] to-[#ff9f1c] text-white'
            : 'bg-primary/10 text-primary',
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
          className="birthday-celebration-card relative overflow-hidden rounded-[1.75rem] border px-5 py-6 sm:px-7 sm:py-7"
          aria-live="polite"
        >
          <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="birthday-pulse-icon grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff6b9d] to-[#ff9f1c] text-white shadow-lg shadow-[#ff6b9d]/35">
                <PartyPopper aria-hidden className="size-6" />
              </span>
              <div className="min-w-0 space-y-2">
                {isCurrentUserBirthday ? (
                  <>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-[#ff6b9d]/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#c9184a]">
                      <Sparkles aria-hidden className="size-3.5 text-[#ff9f1c]" />
                      ¡Hoy es tu día!
                    </p>
                    <h2 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                      Feliz cumpleaños,{' '}
                      <span className="birthday-name-gradient">
                        {firstNameOf(currentUserName ?? '')}
                      </span>
                      !
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Que tengas un día increíble. Tu equipo en esta instancia
                      también lo celebra contigo
                      {todayColleagueBirthdays.length > 0
                        ? ' — ¡y no es el único festejo de hoy!'
                        : '.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-[#4cc9f0]/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0077b6]">
                      <Sparkles aria-hidden className="size-3.5 text-[#ff9f1c]" />
                      Cumpleaños de hoy
                    </p>
                    <h2 className="text-balance text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                      {buildBirthdayReminderMessage(todayColleagueBirthdays)}
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Un saludo rápido les puede alegrar el día.
                    </p>
                  </>
                )}
                {isCurrentUserBirthday && todayColleagueBirthdays.length > 0 ? (
                  <p className="max-w-2xl rounded-xl bg-white/55 px-3 py-2 text-sm font-medium leading-relaxed text-slate-700 backdrop-blur dark:bg-black/25 dark:text-slate-200">
                    {buildBirthdayReminderMessage(todayColleagueBirthdays)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:max-w-xs sm:justify-end">
              {celebrants.map((person) => (
                <Link
                  key={person.id}
                  to={getUserDetailPath(person.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/85 py-1.5 pe-3.5 ps-1.5 text-sm font-semibold text-slate-800 shadow-md shadow-[#ff6b9d]/20 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white dark:border-white/20 dark:bg-slate-900/70 dark:text-white"
                >
                  <BirthdayAvatar person={person} festive />
                  <span className="max-w-[10rem] truncate">{person.name}</span>
                  <Gift aria-hidden className="size-3.5 text-[#ff6b9d]" />
                </Link>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#ff6b9d,#ffd166,#06d6a0,#4cc9f0,#f72585,#ff6b9d)] bg-[length:220%_100%] opacity-90"
            style={{ animation: 'birthday-banner-shimmer 3.5s linear infinite' }}
            aria-hidden
          />
        </section>
      ) : null}

      <section className="birthday-month-card overflow-hidden rounded-[1.5rem] border shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-[#ff8fab]/25 bg-gradient-to-r from-[#fff0f5] via-[#fff8e7] to-[#e8fff8] px-5 py-4 dark:from-[#2a1620] dark:via-[#2a2416] dark:to-[#142422]">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff6b9d] to-[#ff9f1c] text-white shadow-md shadow-[#ff6b9d]/30">
              <Cake aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#c9184a]">
                Equipo
              </p>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Cumpleaños del mes
              </h2>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                Celebraciones de {monthName} en tu instancia
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gradient-to-r from-[#ff6b9d] to-[#ff9f1c] px-2.5 py-1 text-xs font-bold tabular-nums text-white shadow-sm">
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
          <ul className="divide-y divide-[#ff8fab]/20">
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
                      'flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#fff0f5]/70 dark:hover:bg-white/5',
                      today && 'birthday-today-row',
                    )}
                  >
                    <BirthdayAvatar person={person} festive={today} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {person.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {formatBirthdayDayLabel(person.birthDate)}
                        {today ? ' · Hoy' : isPast ? ' · Ya celebrado' : ''}
                      </p>
                    </div>
                    {today ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ff6b9d] to-[#ff9f1c] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
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
