import {
  normalizeProfilePermissions,
  PERMISSION_ACTION_LABELS,
  type MenuModulePermission,
  type ModulePermissionFlags,
  type PermissionAction,
} from '@/lib/menu-modules'
import { cn } from '@/lib/utils'

const ACTIONS: PermissionAction[] = ['menu', 'view', 'create', 'edit', 'delete']

type ProfilePermissionsEditorProps = {
  permissions: MenuModulePermission[]
  onChange: (permissions: MenuModulePermission[]) => void
  disabled?: boolean
}

function updateFlags(
  permissions: MenuModulePermission[],
  moduleId: string,
  patch: Partial<ModulePermissionFlags>,
): MenuModulePermission[] {
  const base = normalizeProfilePermissions(permissions)
  return base.map((p) =>
    p.moduleId === moduleId
      ? { ...p, flags: { ...p.flags, ...patch } }
      : p,
  )
}

function setColumnAll(
  permissions: MenuModulePermission[],
  action: PermissionAction,
  value: boolean,
): MenuModulePermission[] {
  return normalizeProfilePermissions(permissions).map((p) => ({
    ...p,
    flags: { ...p.flags, [action]: value },
  }))
}

export function ProfilePermissionsEditor({
  permissions,
  onChange,
  disabled = false,
}: ProfilePermissionsEditorProps) {
  const ordered = normalizeProfilePermissions(permissions)

  const toggle = (moduleId: string, action: PermissionAction, checked: boolean) => {
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
    onChange(updateFlags(ordered, moduleId, patch))
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
                        onChange(setColumnAll(ordered, action, true))
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
              {ACTIONS.map((action) => (
                <td key={action} className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={row.flags[action]}
                    disabled={disabled}
                    onChange={(e) =>
                      toggle(row.moduleId, action, e.target.checked)
                    }
                    aria-label={`${row.label} — ${PERMISSION_ACTION_LABELS[action]}`}
                    className={cn(
                      'mx-auto size-4 rounded border border-input accent-primary',
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
