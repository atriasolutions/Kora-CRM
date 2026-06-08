import { AvatarImage, type AvatarImageProps } from '@/components/ui/avatar'
import { useAuthenticatedImageSrc } from '@/lib/authenticated-image'

type EntityAvatarImageProps = Omit<AvatarImageProps, 'src'> & {
  src?: string | null
}

/** Avatar/logo en listados: obtiene imágenes del API con sesión (data URLs no van en listados). */
export function EntityAvatarImage({ src, alt, ...props }: EntityAvatarImageProps) {
  const resolved = useAuthenticatedImageSrc(src ?? undefined)
  if (!resolved) return null
  return <AvatarImage src={resolved} alt={alt} {...props} />
}
