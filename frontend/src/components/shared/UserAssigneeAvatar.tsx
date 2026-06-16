import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserAvatarById, useUserAvatarUrl } from '@/hooks/use-user-avatar-url'
import { initialsFromLabel } from '@/lib/image-upload'
import { cn } from '@/lib/utils'

type UserAssigneeAvatarProps = {
  name: string
  userId?: string
  className?: string
  fallbackClassName?: string
}

export function UserAssigneeAvatar({
  name,
  userId,
  className,
  fallbackClassName,
}: UserAssigneeAvatarProps) {
  const resolvedUserId = userId?.trim() ?? ''
  const avatarUrlById = useUserAvatarById(resolvedUserId, name)
  const avatarUrlByName = useUserAvatarUrl(name)
  const avatarUrl = resolvedUserId ? avatarUrlById : avatarUrlByName

  return (
    <Avatar className={className} title={name}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className={fallbackClassName}>
        {initialsFromLabel(name)}
      </AvatarFallback>
    </Avatar>
  )
}
