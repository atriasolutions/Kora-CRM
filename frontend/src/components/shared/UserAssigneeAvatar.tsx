import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserAvatarUrl } from '@/hooks/use-user-avatar-url'
import { initialsFromLabel } from '@/lib/image-upload'
import { cn } from '@/lib/utils'

type UserAssigneeAvatarProps = {
  name: string
  className?: string
  fallbackClassName?: string
}

export function UserAssigneeAvatar({
  name,
  className,
  fallbackClassName,
}: UserAssigneeAvatarProps) {
  const avatarUrl = useUserAvatarUrl(name)

  return (
    <Avatar className={className} title={name}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className={fallbackClassName}>
        {initialsFromLabel(name)}
      </AvatarFallback>
    </Avatar>
  )
}
