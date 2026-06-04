import { Bell, HelpCircle, LogOut, Menu, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getUserApi } from '@/api/users'

import { AppBrand } from '@/components/layout/AppBrand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useHelpOverlay } from '@/contexts/help-context-provider'
import { isApiEnabled } from '@/api/config'
import { getUserDetail } from '@/data/user-detail.mock'
import { useAuth } from '@/hooks/use-auth'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { useShellLayout } from '@/contexts/shell-layout'
import { getLoginPath } from '@/lib/auth-routes'
import { getCurrentUser } from '@/lib/current-user'
import { getUserDetailPath } from '@/lib/user-routes'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/contexts/notifications-context'

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatNotificationTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TopBar() {
  const navigate = useNavigate()
  const { openMobileNav } = useShellLayout()
  const { openHelp } = useHelpOverlay()
  const { logout } = useAuth()
  const { findById } = useUsersRegistry()
  const current = getCurrentUser()
  const registryUser = findById(current.id)
  const userDetail = isApiEnabled() ? undefined : getUserDetail(current.id)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | undefined>()
  const initials = initialsFromName(current.name)

  useEffect(() => {
    if (!isApiEnabled() || !current.id) return
    let cancelled = false
    void getUserApi(current.id)
      .then((user) => {
        if (!cancelled) setProfileAvatarUrl(user.avatarUrl)
      })
      .catch(() => {
        if (!cancelled) setProfileAvatarUrl(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [current.id])

  const avatarUrl =
    registryUser?.avatarUrl ?? profileAvatarUrl ?? userDetail?.avatarUrl
  const { unreadCount, items, markAllRead, markRead, clearAll } = useNotifications()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleLogout = () => {
    logout()
    navigate(getLoginPath(), { replace: true })
  }

  const handleMyProfile = () => {
    navigate(getUserDetailPath(current.id))
  }

  const handleClearConfirm = async () => {
    setClearing(true)
    try {
      await clearAll()
      setClearConfirmOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-2 border-b border-border/70 bg-background/90 backdrop-blur-md',
        'pt-[env(safe-area-inset-top)] pb-2.5',
        'ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))]',
        'sm:gap-3 sm:pb-3',
        'sm:ps-[max(1rem,env(safe-area-inset-left))] sm:pe-[max(1rem,env(safe-area-inset-right))]',
        'lg:gap-4 lg:px-6',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-full text-muted-foreground lg:hidden"
        aria-label="Abrir menú de navegación"
        onClick={openMobileNav}
      >
        <Menu aria-hidden className="size-5" />
      </Button>

      <AppBrand variant="compact" className="shrink-0 lg:hidden" />

      <GlobalSearch />

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              aria-label="Notificaciones"
            >
              <Bell aria-hidden className="size-[18px]" />
              {unreadCount > 0 ? (
                <span
                  className="absolute -end-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background"
                  aria-hidden
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span className="font-normal">Notificaciones</span>
              {items.length > 0 ? (
                <span className="flex items-center gap-2">
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void markAllRead()
                      }}
                    >
                      Marcar leídas
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setClearConfirmOpen(true)
                    }}
                  >
                    Limpiar
                  </button>
                </span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                Sin notificaciones
              </div>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                {items.slice(0, 10).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-1 px-3 py-2.5"
                    onSelect={(e) => {
                      e.preventDefault()
                      void markRead(n.id)
                      if (n.href) navigate(n.href)
                    }}
                  >
                    <span className="text-sm font-medium leading-tight">
                      {n.title}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {n.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {n.readAt ? 'Leída' : 'Nuevo'} · {formatNotificationTime(n.createdAt)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Limpiar notificaciones</DialogTitle>
              <DialogDescription>
                Se eliminará todo el historial de notificaciones de tu bandeja. Esta acción no se
                puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClearConfirmOpen(false)}
                disabled={clearing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleClearConfirm()}
                disabled={clearing}
              >
                {clearing ? 'Limpiando…' : 'Limpiar todo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              aria-label="Ayuda"
              onClick={openHelp}
            >
              <HelpCircle aria-hidden className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Ayuda de esta pantalla (atajo: ?)
          </TooltipContent>
        </Tooltip>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-6 sm:mx-1.5 sm:block"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex max-w-[11rem] items-center gap-2 rounded-full py-1 ps-1 pe-2.5 transition-colors',
                'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                'data-[state=open]:bg-muted/80',
                'sm:pe-3',
              )}
              aria-label="Menú de cuenta"
            >
              <Avatar className="size-8 shrink-0 ring-1 ring-border/60 sm:size-9">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={`Avatar de ${current.name}`} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden min-w-0 truncate text-start leading-tight lg:block">
                <span className="block truncate text-sm font-medium text-foreground">
                  {current.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {registryUser?.role ?? userDetail?.role ?? ''}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium text-foreground">{current.name}</p>
              <p className="truncate text-xs text-muted-foreground">{current.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleMyProfile}>
              <UserRound aria-hidden className="size-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut aria-hidden className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
