export type ModulePermissionFlags = {
  menu: boolean
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export type MenuModulePermission = {
  moduleId: string
  label?: string
  flags: ModulePermissionFlags
}

export type AccessProfileListItem = {
  id: string
  name: string
  description: string
  userCount: number
  updatedAt: string
  isSystem?: boolean
  systemKey?: 'admin' | 'guest' | null
}

export type AccessProfile = AccessProfileListItem & {
  permissions: MenuModulePermission[]
}

export type CreateAccessProfileInput = {
  name: string
  description?: string
  permissions: MenuModulePermission[]
}

export type UpdateAccessProfileInput = Partial<CreateAccessProfileInput>
