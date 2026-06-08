import { Bell, HelpCircle, LogOut, Menu, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getUserApi } from '@/api/users'

import { AppBrand } from '@/components/layout/AppBrand'
import { TenantSwitcher } from '@/components/auth/TenantSwitcher'
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
import { formatChileDateTimeLabel } from '@/lib/chile-timezone'
import { getCurrentUser } from '@/lib/current-user'
import { getUserDetailPath } from '@/lib/user-routes'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/contexts/notifications-context'
import type { NotificationItem } from '@/types/notification'

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatNotificationTime(value: string): string {
  const formatted = formatChileDateTimeLabel(value)
  return formatted === '—' ? '' : formatted
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
    void logout()
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

  const visibleNotifications = useMemo(() => items.slice(0, 10), [items])
  const unreadNotifications = useMemo(
    () => visibleNotifications.filter((n) => !n.readAt),
    [visibleNotifications],
  )
  const readNotifications = useMemo(
    () => visibleNotifications.filter((n) => n.readAt),
    [visibleNotifications],
  )

  const renderNotificationItem = (n: NotificationItem) => {
    const isUnread = !n.readAt
    return (
      <DropdownMenuItem
        key={n.id}
        className={cn(
          'relative flex flex-col items-start gap-1 rounded-lg px-3 py-2.5',
          isUnread
            ? 'bg-primary/10 shadow-[inset_3px_0_0_0_hsl(var(--primary))] focus:bg-primary/15'
            : 'bg-muted/25 opacity-80 focus:bg-muted/40',
        )}
        onSelect={(e) => {
          e.preventDefault()
          void markRead(n.id)
          if (n.href) navigate(n.href)
        }}
      >
        {isUnread ? (
          <span
            className="absolute start-2 top-3 size-2 rounded-full bg-primary ring-2 ring-popover"
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            'flex w-full items-start justify-between gap-2',
            isUnread && 'ps-3',
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 text-sm leading-tight',
              isUnread
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground',
            )}
          >
            {n.title}
          </span>
          {isUnread ? (
            <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
              Nuevo
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground/70">
              Leída
            </span>
          )}
        </span>
        <span
          className={cn(
            'w-full text-xs leading-snug',
            isUnread ? 'text-foreground/80' : 'text-muted-foreground',
          )}
        >
          {n.message}
        </span>
        <span
          className={cn(
            'w-full text-[10px]',
            isUnread ? 'font-medium text-primary/80' : 'text-muted-foreground/70',
          )}
        >
          {formatNotificationTime(n.createdAt)}
        </span>
      </DropdownMenuItem>
    )
  }

  return (
    <header
      className={cn(
        'relative z-20 flex shrink-0 items-center gap-2',
        'border-b border-border/60 bg-gradient-to-r from-background via-background to-primary/[0.04]',
        'shadow-[0_1px_0_0_hsl(var(--border)/0.9),0_8px_32px_-12px_rgba(15,23,42,0.1)]',
        'backdrop-blur-xl supports-[backdrop-filter]:bg-background/85',
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

      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 rounded-full border border-border/50',
          'bg-muted/35 p-0.5 shadow-sm sm:gap-1 sm:p-1',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-full text-muted-foreground hover:bg-background/90 hover:text-foreground hover:shadow-sm"
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
          <DropdownMenuContent
            align="end"
            className="w-80 border-border/80 shadow-lg"
          >
            <DropdownMenuLabel className="flex items-center justify-between gap-2 bg-muted/30 py-2.5">
              <span className="text-sm font-semibold text-foreground">Notificaciones</span>
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
              <div className="max-h-[320px] overflow-auto p-1">
                {unreadNotifications.length > 0 ? (
                  <>
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      Sin leer ({unreadNotifications.length})
                    </p>
                    {unreadNotifications.map(renderNotificationItem)}
                  </>
                ) : null}
                {unreadNotifications.length > 0 && readNotifications.length > 0 ? (
                  <DropdownMenuSeparator className="my-1" />
                ) : null}
                {readNotifications.length > 0 ? (
                  <>
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Leídas
                    </p>
                    {readNotifications.map(renderNotificationItem)}
                  </>
                ) : null}
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
              className="size-9 rounded-full text-muted-foreground hover:bg-background/90 hover:text-foreground hover:shadow-sm"
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
          className="mx-0.5 hidden h-7 bg-border/70 sm:mx-1"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex max-w-[11rem] items-center gap-2 rounded-full py-1 ps-1 pe-2.5 transition-all',
                'hover:bg-background/90 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                'data-[state=open]:bg-background/90 data-[state=open]:shadow-sm',
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
            <TenantSwitcher />
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
