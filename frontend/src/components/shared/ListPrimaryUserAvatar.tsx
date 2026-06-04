import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserAvatarById } from '@/hooks/use-user-avatar-url'
import { cn } from '@/lib/utils'

type ListPrimaryUserAvatarProps = {
  userId: string
  name: string
  initials: string
  avatarUrl?: string
  className?: string
}

export function ListPrimaryUserAvatar({
  userId,
  name,
  initials,
  avatarUrl,
  className,
}: ListPrimaryUserAvatarProps) {
  const resolvedUrl = useUserAvatarById(userId, name, avatarUrl)

  return (
    <Avatar className={cn('size-10 shrink-0 border border-border', className)}>
      {resolvedUrl ? <AvatarImage src={resolvedUrl} alt={name} /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
