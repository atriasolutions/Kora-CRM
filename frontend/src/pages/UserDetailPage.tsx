import {
  ArrowLeft,
  ChevronRight,
  LayoutList,
  Shield,
  StickyNote,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { EditUserDialog } from '@/components/users/EditUserDialog'
import { UserDetailHeader } from '@/components/users/UserDetailHeader'
import { UserDetailSidebar } from '@/components/users/UserDetailSidebar'
import { UserTwoFactorPanel } from '@/components/users/UserTwoFactorPanel'
import { UserPermissionsPanel } from '@/components/users/UserPermissionsPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserDetail } from '@/data/user-detail.mock'
import { loadUserDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { parseUserDetailTab, type UserDetailTab } from '@/lib/user-routes'
import { CURRENT_USER_NAME, getCurrentUser } from '@/lib/current-user'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useAuth } from '@/hooks/use-auth'
import { resendInvitationApi } from '@/api/users'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const tabs: { id: UserDetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'permisos', label: 'Permisos', Icon: Shield },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

export function UserDetailPage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { session } = useAuth()
  const { canEdit, canDelete } = useModulePermissions('usuarios')
  const canRemoveUser = Boolean(session?.isPlatformOperator)
  const { updateUserFromDetail, removeUser } = useUsersRegistry()
  const tab: UserDetailTab = parseUserDetailTab(searchParams) ?? 'detalle'
  const [user, setUser] = useState<UserDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: userId,
    load: loadUserDetail,
    onLoaded: (id, record) => {
      setUser(record)
      recordEntityView('usuarios', id)
    },
  })
  const [editOpen, setEditOpen] = useState(false)

  const selectTab = useCallback(
    (next: UserDetailTab) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'detalle') {
            params.delete('tab')
          } else {
            params.set('tab', next)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleUserSaved = useCallback(
    async (updated: UserDetail) => {
      try {
        const saved = await updateUserFromDetail(updated)
        setUser(saved)
        toast.success(`Usuario «${saved.name}» actualizado correctamente.`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo guardar el usuario.',
        )
      }
    },
    [updateUserFromDetail],
  )

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'usuario',
    entityId: userId,
    setRecord: setUser,
    onAdded: () => {
      selectTab('notas')
      toast.success('Nota agregada.')
    },
    onAfterChange: (next) => {
      void updateUserFromDetail(next)
    },
  })

  const handleResendInvite = useCallback(async () => {
    if (!user) return
    if (!isApiEnabled()) {
      toast.success(`Invitación reenviada a ${user.email}.`)
      return
    }
    try {
      const result = await resendInvitationApi(user.id)
      if (result.emailed) {
        toast.success(
          `Correo de activación reenviado a ${user.email} (válido ${result.expiresHours} h).`,
        )
      } else {
        toast.warning(
          'No se envió el correo (revisa MAIL_ENABLED y MAILTRAP_TOKEN en el servidor).',
        )
      }
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo reenviar la invitación.'))
    }
  }, [user])

  const handleDeactivate = useCallback(() => {
    if (!user || user.status === 'Inactivo') return
    const updated: UserDetail = { ...user, status: 'Inactivo' }
    updateUserFromDetail(updated)
    setUser(updated)
    toast.success(`Usuario «${user.name}» desactivado.`)
  }, [updateUserFromDetail, user])

  const handleDelete = useCallback(async () => {
    if (!user || !canRemoveUser) return
    const confirmed = window.confirm(
      `¿Eliminar a «${user.name}» de esta instancia?\n\n` +
        'Se quitará su acceso a esta empresa. Si no pertenece a otras instancias, la cuenta se eliminará por completo.',
    )
    if (!confirmed) return
    try {
      await removeUser(user.id)
      toast.success(`Usuario «${user.name}» eliminado.`)
      navigate('/usuarios')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo eliminar el usuario.'))
    }
  }, [canRemoveUser, navigate, removeUser, user])

  const isOwnProfile = useMemo(
    () => (user ? getCurrentUser().id === user.id : false),
    [user?.id],
  )

  const handleTwoFactorUserPatch = useCallback((patch: Partial<UserDetail>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="usuarios"
        reason={reason}
        detail={unavailableDetail}
        recordId={userId}
      onRetry={reload}
      />
    )
  }

  if (!user) {
    return <RecordDetailLoading />
  }

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-muted-foreground"
          asChild
        >
          <Link to="/usuarios">
            <ArrowLeft aria-hidden className="size-4" />
            Usuarios
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="font-medium text-foreground">{user.name}</span>
      </nav>

      <UserDetailHeader
        user={user}
        onStartEdit={canEdit ? () => setEditOpen(true) : undefined}
        onResendInvite={handleResendInvite}
        onDeactivate={canDelete ? handleDeactivate : undefined}
        onDelete={canRemoveUser ? handleDelete : undefined}
      />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'detalle' ? (
        <div className="space-y-4">
          <UserDetailSidebar user={user} />
          <UserTwoFactorPanel
            user={user}
            isSelf={isOwnProfile}
            canAdminManage={canEdit}
            onUserUpdated={handleTwoFactorUserPatch}
          />
        </div>
      ) : null}

      {tab === 'permisos' ? <UserPermissionsPanel user={user} /> : null}

      {tab === 'notas' ? (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityNotesPanel
              notes={user.notes}
              authorName={CURRENT_USER_NAME}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <EditUserDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          onSave={handleUserSaved}
        />
      ) : null}
    </PageScrollArea>
  )
}
