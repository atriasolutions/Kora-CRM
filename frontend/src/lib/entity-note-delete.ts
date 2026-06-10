import { isApiEnabled } from '@/api/config'
import type { ContactNote } from '@/data/contact-detail.mock'
import { isSystemAccessProfile } from '@/lib/access-profile-admin'
import type { AuthSession } from '@/lib/auth-session'
import type { AccessProfile } from '@/types/access-profile'

export function canDeleteEntityNote(
  note: Pick<ContactNote, 'authorUserId' | 'author'>,
  session: AuthSession | null | undefined,
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): boolean {
  if (!session) return false
  if (isSystemAccessProfile(profile) || session.isPlatformOperator) return true

  const userId = session.userId?.trim()
  const authorUserId = note.authorUserId?.trim()
  if (userId && authorUserId && userId === authorUserId) return true

  if (!isApiEnabled()) {
    const myName = session.name?.trim().toLowerCase()
    const authorName = note.author?.trim().toLowerCase()
    if (myName && authorName && myName === authorName) return true
  }

  return false
}
