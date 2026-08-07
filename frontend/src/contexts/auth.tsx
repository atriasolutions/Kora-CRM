import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  confirmEnrollmentLoginApi,
  fetchMeApi,
  loginApi,
  logoutApi,
  verifyTwoFactorLoginApi,
} from '@/api/auth'
import type { LoginOutcome } from '@/contexts/auth-context'
import { isApiEnabled } from '@/api/config'
import { AuthContext } from '@/contexts/auth-context'
import { authenticateUser } from '@/lib/auth'
import { parseLoginErrorMessage } from '@/lib/login-errors'
import {
  clearAuthSession,
  consumePostLogoutLanding,
  loadAuthSession,
  markLoggedOut,
  saveAuthSession,
  type AuthSession,
} from '@/lib/auth-session'
import { resolveLoginRedirectUrl, resolveLogoutRedirectUrl } from '@/lib/auth-routes'
import { clearMentionApiCache } from '@/lib/mentions'
import { resolveTenantSlugFromHostname } from '@/lib/tenant-host'
import type { UserDetail } from '@/data/user-detail.mock'
import type { AccessProfile } from '@/types/access-profile'
import type { AuthMembershipContext } from '@/contexts/auth-context'

const useApi = isApiEnabled()

function membershipFromUser(user: Pick<UserDetail, 'guestCompanyId' | 'guestCompanyName'>): AuthMembershipContext {
  const guestCompanyId = user.guestCompanyId?.trim() || undefined
  const guestCompanyName = user.guestCompanyName?.trim() || undefined
  if (!guestCompanyId && !guestCompanyName) return {}
  return { guestCompanyId, guestCompanyName }
}

function sessionFromLogin(
  token: string,
  user: { id: string; email: string; name: string; profileId: string },
  tenantId?: string,
  tenantSlug?: string,
  isPlatformOperator?: boolean,
): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    token,
    profileId: user.profileId,
    tenantId,
    tenantSlug: tenantSlug ?? resolveTenantSlugFromHostname(window.location.hostname) ?? undefined,
    isPlatformOperator: isPlatformOperator ?? false,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (typeof window !== 'undefined' && consumePostLogoutLanding()) {
      return null
    }
    return loadAuthSession()
  })
  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [membership, setMembership] = useState<AuthMembershipContext | null>(null)
  const [isReady, setIsReady] = useState(!useApi)
  /** Token validado al montar; si el login crea uno nuevo, ignoramos fallos del bootstrap anterior. */
  const bootstrapTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!useApi) return

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('loggedOut') === '1') {
        clearAuthSession()
        bootstrapTokenRef.current = null
        setSession(null)
        setProfile(null)
        setMembership(null)
        setIsReady(true)
        return
      }
    }

    const stored = loadAuthSession()
    if (!stored?.token) {
      bootstrapTokenRef.current = null
      setIsReady(true)
      return
    }

    const validatedToken = stored.token
    bootstrapTokenRef.current = validatedToken
    let cancelled = false
    void fetchMeApi()
      .then(({ user, profile: meProfile, tenantId, tenantSlug, isPlatformOperator }) => {
        if (cancelled || bootstrapTokenRef.current !== validatedToken) return
        const next = sessionFromLogin(
          validatedToken,
          {
            id: user.id,
            email: user.email,
            name: user.name,
            profileId: user.profileId,
          },
          tenantId ?? stored.tenantId,
          tenantSlug ??
            stored.tenantSlug ??
            resolveTenantSlugFromHostname(window.location.hostname) ??
            undefined,
          isPlatformOperator ?? stored.isPlatformOperator,
        )
        saveAuthSession(next)
        setSession(next)
        setProfile(meProfile)
        setMembership(membershipFromUser(user))
      })
      .catch(() => {
        if (cancelled || bootstrapTokenRef.current !== validatedToken) return
        const current = loadAuthSession()
        if (current?.token && current.token !== validatedToken) return
        clearAuthSession()
        setSession(null)
        setProfile(null)
        setMembership(null)
      })
      .finally(() => {
        if (!cancelled && bootstrapTokenRef.current === validatedToken) setIsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const applyLoginSession = useCallback(
    (
      token: string,
      user: Pick<UserDetail, 'id' | 'email' | 'name' | 'profileId' | 'guestCompanyId' | 'guestCompanyName'>,
      meProfile: AccessProfile,
      tenantId: string,
      tenantSlug?: string,
      isPlatformOperator?: boolean,
    ) => {
      bootstrapTokenRef.current = token
      const next = sessionFromLogin(token, user, tenantId, tenantSlug, isPlatformOperator)
      clearMentionApiCache()
      saveAuthSession(next)
      setSession(next)
      setProfile(meProfile)
      setMembership(membershipFromUser(user))
      setIsReady(true)
    },
    [],
  )

  const login = useCallback(
    async (
      email: string,
      password: string,
      tenantId?: string,
      tenantSlug?: string,
    ): Promise<LoginOutcome> => {
      const normalizedEmail = email.trim()
      if (!normalizedEmail) return { status: 'error', message: 'Indica tu correo electrónico.' }
      if (!password) return { status: 'error', message: 'Indica tu contraseña.' }

      if (useApi) {
        try {
          const result = await loginApi(normalizedEmail, password, tenantId)
          if (result.kind === 'verify') {
            return {
              status: 'verify',
              challengeId: result.challengeId,
              userEmail: result.user.email,
              tenantId: result.tenantId,
            }
          }
          if (result.kind === 'enroll') {
            return {
              status: 'enroll',
              enrollmentToken: result.enrollmentToken,
              userEmail: result.user.email,
              tenantId: result.tenantId,
            }
          }
          applyLoginSession(
            result.token,
            result.user,
            result.profile,
            result.tenantId,
            tenantSlug,
            result.isPlatformOperator,
          )
          return { status: 'ok' }
        } catch (err) {
          return { status: 'error', message: parseLoginErrorMessage(err) }
        }
      }

      const result = authenticateUser(normalizedEmail, password)
      if (!result.ok) return { status: 'error', message: result.message }
      saveAuthSession(result.session)
      setSession(result.session)
      setProfile(null)
      return { status: 'ok' }
    },
    [applyLoginSession],
  )

  const completeTwoFactorLogin = useCallback(
    async (challengeId: string, code: string, tenantId?: string): Promise<LoginOutcome> => {
      if (!useApi) return { status: 'error', message: '2FA no disponible en modo demo.' }
      try {
        const result = await verifyTwoFactorLoginApi(challengeId, code, tenantId)
        applyLoginSession(
          result.token,
          result.user,
          result.profile,
          result.tenantId,
          undefined,
          result.isPlatformOperator,
        )
        return { status: 'ok' }
      } catch (err) {
        return { status: 'error', message: parseLoginErrorMessage(err) }
      }
    },
    [applyLoginSession],
  )

  const completeEnrollmentLogin = useCallback(
    async (
      enrollmentToken: string,
      code: string,
      setupId?: string,
      tenantId?: string,
    ): Promise<LoginOutcome & { backupCodes?: string[] }> => {
      if (!useApi) return { status: 'error', message: '2FA no disponible en modo demo.' }
      try {
        const result = await confirmEnrollmentLoginApi(
          enrollmentToken,
          code,
          setupId,
          tenantId,
        )
        applyLoginSession(
          result.token,
          result.user,
          result.profile,
          result.tenantId,
          undefined,
          result.isPlatformOperator,
        )
        return { status: 'ok', backupCodes: result.backupCodes }
      } catch (err) {
        return { status: 'error', message: parseLoginErrorMessage(err) }
      }
    },
    [applyLoginSession],
  )

  const refreshProfile = useCallback(async () => {
    if (!useApi || !session?.token) return
    try {
      const { user, profile: meProfile, isPlatformOperator, tenantId, tenantSlug } =
        await fetchMeApi()
      setProfile(meProfile)
      setMembership(membershipFromUser(user))
      const stored = loadAuthSession()
      if (stored?.token) {
        saveAuthSession({
          ...stored,
          profileId: meProfile.id,
          tenantId: tenantId ?? stored.tenantId,
          tenantSlug: tenantSlug || stored.tenantSlug,
          isPlatformOperator,
        })
        setSession((prev) =>
          prev
            ? {
                ...prev,
                profileId: meProfile.id,
                tenantId: tenantId ?? prev.tenantId,
                tenantSlug: tenantSlug || prev.tenantSlug,
                isPlatformOperator,
              }
            : prev,
        )
      }
    } catch {
      /* sesión inválida: logout en próximo request */
    }
  }, [session?.token])

  const logout = useCallback(async () => {
    const token = session?.token ?? loadAuthSession()?.token
    if (useApi && token) {
      try {
        await logoutApi(token)
      } catch {
        /* ignore */
      }
    }
    markLoggedOut()
    bootstrapTokenRef.current = null
    if (typeof window !== 'undefined') {
      window.location.replace(resolveLogoutRedirectUrl())
      return
    }
    setSession(null)
    setProfile(null)
    setMembership(null)
  }, [session?.token])

  const value = useMemo(
    () => ({
      session,
      profile,
      membership,
      isAuthenticated: Boolean(session),
      isReady,
      login,
      completeTwoFactorLogin,
      completeEnrollmentLogin,
      logout,
      refreshProfile,
    }),
    [
      session,
      profile,
      membership,
      isReady,
      login,
      completeTwoFactorLogin,
      completeEnrollmentLogin,
      logout,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
