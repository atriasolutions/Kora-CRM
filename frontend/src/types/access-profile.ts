import type { MenuModulePermission } from '@/lib/menu-modules'

export type AccessProfileListItem = {
  id: string
  name: string
  description: string
  userCount: number
  updatedAt: string
  isSystem?: boolean
}

export type AccessProfile = AccessProfileListItem & {
  permissions: MenuModulePermission[]
}
