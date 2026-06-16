import {
  normalizeProfilePermissions,
  PERMISSION_ACTION_LABELS,
  type MenuModuleId,
  type MenuModulePermission,
  type ModulePermissionFlags,
  type PermissionAction,
} from '@/lib/menu-modules'
import {
  canShowModuleInProfileEditor,
  maxFlagsForModule,
  type ProfileGrantCeiling,
} from '@/lib/profile-permission-grants'
import { cn } from '@/lib/utils'

const ACTIONS: PermissionAction[] = ['menu', 'view', 'create', 'edit', 'delete']

type ProfilePermissionsEditorProps = {
  permissions: MenuModulePermission[]
  onChange: (permissions: MenuModulePermission[]) => void
  disabled?: boolean
  grantCeiling?: ProfileGrantCeiling
}

function isActionGrantable(
  moduleId: MenuModuleId,
  action: PermissionAction,
  ceiling: ProfileGrantCeiling,
): boolean {
  if (!ceiling) return true
  const max = maxFlagsForModule(moduleId, ceiling)
  return max?.[action] ?? false
}

function updateFlags(
  permissions: MenuModulePermission[],
  moduleId: string,
  patch: Partial<ModulePermissionFlags>,
  ceiling: ProfileGrantCeiling,
): MenuModulePermission[] {
  const base = normalizeProfilePermissions(permissions)
  return base.map((p) => {
    if (p.moduleId !== moduleId) return p
    const next = { ...p.flags, ...patch }
    const max = maxFlagsForModule(p.moduleId, ceiling)
    if (!max) return { ...p, flags: next }
    return {
      ...p,
      flags: {
        menu: next.menu && max.menu,
        view: next.view && max.view,
        create: next.create && max.create,
        edit: next.edit && max.edit,
        delete: next.delete && max.delete,
      },
    }
  })
}

function setColumnAll(
  permissions: MenuModulePermission[],
  action: PermissionAction,
  value: boolean,
  ceiling: ProfileGrantCeiling,
): MenuModulePermission[] {
  return normalizeProfilePermissions(permissions).map((p) => {
    if (!canShowModuleInProfileEditor(p.moduleId, ceiling)) return p
    if (!isActionGrantable(p.moduleId, action, ceiling)) return p
    const patch: Partial<ModulePermissionFlags> = { [action]: value }
    if (action === 'menu' && !value) {
      patch.view = false
      patch.create = false
      patch.edit = false
      patch.delete = false
    }
    if (action === 'view' && value) {
      patch.menu = true
    }
    if (['create', 'edit', 'delete'].includes(action) && value) {
      patch.menu = true
      patch.view = true
    }
    return updateFlags([p], p.moduleId, patch, ceiling)[0]!
  })
}

export function ProfilePermissionsEditor({
  permissions,
  onChange,
  disabled = false,
  grantCeiling = null,
}: ProfilePermissionsEditorProps) {
  const ordered = normalizeProfilePermissions(permissions).filter((row) =>
    canShowModuleInProfileEditor(row.moduleId, grantCeiling),
  )

  const toggle = (moduleId: string, action: PermissionAction, checked: boolean) => {
    if (!isActionGrantable(moduleId as MenuModuleId, action, grantCeiling)) return
    const patch: Partial<ModulePermissionFlags> = { [action]: checked }
    if (action === 'menu' && !checked) {
      patch.view = false
      patch.create = false
      patch.edit = false
      patch.delete = false
    }
    if (action === 'view' && checked) {
      patch.menu = true
    }
    if (['create', 'edit', 'delete'].includes(action) && checked) {
      patch.menu = true
      patch.view = true
    }
    onChange(updateFlags(ordered, moduleId, patch, grantCeiling))
  }

  if (ordered.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Tu perfil no incluye módulos que puedas asignar a otros perfiles.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="sticky left-0 z-10 min-w-[160px] bg-muted/40 px-4 py-3 font-medium">
              Módulo / menú
            </th>
            {ACTIONS.map((action) => (
              <th key={action} className="px-3 py-3 text-center font-medium">
                <div className="flex flex-col items-center gap-1">
                  <span>{PERMISSION_ACTION_LABELS[action]}</span>
                  {!disabled && (
                    <button
                      type="button"
                      className="text-[10px] font-normal text-primary hover:underline"
                      onClick={() =>
                        onChange(setColumnAll(ordered, action, true, grantCeiling))
                      }
                    >
                      Todos
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr
              key={row.moduleId}
              className="border-b border-border/60 last:border-0 hover:bg-muted/20"
            >
              <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-foreground">
                {row.label}
              </td>
              {ACTIONS.map((action) => {
                const grantable = isActionGrantable(row.moduleId, action, grantCeiling)
                return (
                  <td key={action} className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={row.flags[action]}
                      disabled={disabled || !grantable}
                      onChange={(e) =>
                        toggle(row.moduleId, action, e.target.checked)
                      }
                      aria-label={`${row.label} — ${PERMISSION_ACTION_LABELS[action]}`}
                      className={cn(
                        'mx-auto size-4 rounded border border-input accent-primary',
                        !grantable && 'opacity-40',
                      )}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
