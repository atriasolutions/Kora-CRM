import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CreateProfileDialog } from '@/components/profiles/CreateProfileDialog'
import { ProfilesModuleHeader } from '@/components/profiles/ProfilesModuleHeader'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProfilesRegistry } from '@/hooks/use-profiles-registry'
import { useAuth } from '@/hooks/use-auth'
import { isLockedAccessProfile } from '@/lib/access-profile-admin'
import { getProfileDetailPath } from '@/lib/profile-routes'
import { toast } from '@/lib/toast'
import type { AccessProfileListItem } from '@/types/access-profile'

export function ProfilesPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { listItems, addProfile } = useProfilesRegistry()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...listItems].sort((a, b) => {
      const aLocked = isLockedAccessProfile(a) ? 0 : 1
      const bLocked = isLockedAccessProfile(b) ? 0 : 1
      if (aLocked !== bLocked) return aLocked - bLocked
      return a.name.localeCompare(b.name, 'es')
    })
    if (!q) return sorted
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [listItems, query])

  const openDetail = useCallback(
    (row: AccessProfileListItem) => {
      navigate(getProfileDetailPath(row.id))
    },
    [navigate],
  )

  const handleCreate = useCallback(
    async (input: Parameters<typeof addProfile>[0]) => {
      const created = await addProfile(input)
      toast.success(`Perfil «${created.name}» creado.`)
      navigate(getProfileDetailPath(created.id))
    },
    [addProfile, navigate],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <ProfilesModuleHeader
            query={query}
            onQueryChange={setQuery}
            onCreate={() => setCreateOpen(true)}
          />
        }
      >
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="w-[220px] px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="w-[100px] px-4 py-3 text-center font-medium">Usuarios</th>
                  <th className="w-[130px] px-4 py-3 font-medium">Actualizado</th>
                  <th className="w-[90px] px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No hay perfiles que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/20"
                      onClick={() => openDetail(row)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{row.name}</span>
                          {isLockedAccessProfile(row) ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Predefinido
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                        {row.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">{row.userCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.updatedAt}</td>
                      <td className="px-4 py-3 text-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(row)
                          }}
                        >
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!session?.isPlatformOperator ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Los perfiles Administrador e Invitado son predefinidos por instancia y no pueden
              editarse desde aquí.
            </p>
          ) : null}
        </div>
      </ListPageLayout>

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
  )
}
