import { chilePartsFromDate } from '@/lib/chile-timezone'

export type BirthdayPerson = {
  id: string
  name: string
  avatarUrl?: string
  /** YYYY-MM-DD */
  birthDate: string
}

function parseBirthParts(birthDate: string): { month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim())
  if (!match) return null
  const month = Number(match[2])
  const day = Number(match[3])
  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { month, day }
}

export function isBirthdayToday(
  birthDate: string,
  now: Date = new Date(),
): boolean {
  const parts = parseBirthParts(birthDate)
  if (!parts) return false
  const chile = chilePartsFromDate(now)
  return parts.month === chile.month && parts.day === chile.day
}

export function isBirthdayThisMonth(
  birthDate: string,
  now: Date = new Date(),
): boolean {
  const parts = parseBirthParts(birthDate)
  if (!parts) return false
  return parts.month === chilePartsFromDate(now).month
}

export function birthDayOfMonth(birthDate: string): number | null {
  return parseBirthParts(birthDate)?.day ?? null
}

export function formatBirthdayDayLabel(birthDate: string): string {
  const parts = parseBirthParts(birthDate)
  if (!parts) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, parts.month - 1, parts.day)))
}

export function firstNameOf(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return 'colegas'
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export function buildBirthdayReminderMessage(people: BirthdayPerson[]): string {
  if (people.length === 0) return ''
  if (people.length === 1) {
    return `No olvides saludar por su cumpleaños a ${people[0]!.name}.`
  }
  if (people.length === 2) {
    return `No olvides saludar por su cumpleaños a ${people[0]!.name} y ${people[1]!.name}.`
  }
  const head = people
    .slice(0, -1)
    .map((p) => p.name)
    .join(', ')
  const last = people[people.length - 1]!.name
  return `No olvides saludar por su cumpleaños a ${head} y ${last}.`
}

export function partitionTenantBirthdays(
  people: BirthdayPerson[],
  currentUserId: string | undefined,
  now: Date = new Date(),
): {
  monthBirthdays: BirthdayPerson[]
  todayBirthdays: BirthdayPerson[]
  todayColleagueBirthdays: BirthdayPerson[]
  isCurrentUserBirthday: boolean
} {
  const monthBirthdays = people
    .filter((p) => isBirthdayThisMonth(p.birthDate, now))
    .sort((a, b) => (birthDayOfMonth(a.birthDate) ?? 0) - (birthDayOfMonth(b.birthDate) ?? 0))

  const todayBirthdays = people.filter((p) => isBirthdayToday(p.birthDate, now))
  const todayColleagueBirthdays = todayBirthdays.filter((p) => p.id !== currentUserId)
  const isCurrentUserBirthday = Boolean(
    currentUserId && todayBirthdays.some((p) => p.id === currentUserId),
  )

  return {
    monthBirthdays,
    todayBirthdays,
    todayColleagueBirthdays,
    isCurrentUserBirthday,
  }
}
