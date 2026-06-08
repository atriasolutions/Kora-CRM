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
  loadAuthSession,
  saveAuthSession,
  type AuthSession,
} from '@/lib/auth-session'
import { resolveLoginRedirectUrl } from '@/lib/auth-routes'
import { resolveTenantSlugFromHostname } from '@/lib/tenant-host'
import type { AccessProfile } from '@/types/access-profile'

const useApi = isApiEnabled()

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
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession())
  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [isReady, setIsReady] = useState(!useApi)
  /** Token validado al montar; si el login crea uno nuevo, ignoramos fallos del bootstrap anterior. */
  const bootstrapTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!useApi) return

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
      })
      .catch(() => {
        if (cancelled || bootstrapTokenRef.current !== validatedToken) return
        const current = loadAuthSession()
        if (current?.token && current.token !== validatedToken) return
        clearAuthSession()
        setSession(null)
        setProfile(null)
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
      user: { id: string; email: string; name: string; profileId: string },
      meProfile: AccessProfile,
      tenantId: string,
      tenantSlug?: string,
      isPlatformOperator?: boolean,
    ) => {
      bootstrapTokenRef.current = null
      const next = sessionFromLogin(token, user, tenantId, tenantSlug, isPlatformOperator)
      saveAuthSession(next)
      setSession(next)
      setProfile(meProfile)
      setIsReady(true)
    },
    [],
  )

  const login = useCallback(
    async (email: string, password: string, tenantId?: string): Promise<LoginOutcome> => {
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
            undefined,
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
      const { profile: meProfile, isPlatformOperator, tenantId, tenantSlug } =
        await fetchMeApi()
      setProfile(meProfile)
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
    if (useApi && session?.token) {
      try {
        await logoutApi()
      } catch {
        /* ignore */
      }
    }
    clearAuthSession()
    setSession(null)
    setProfile(null)
    if (typeof window !== 'undefined') {
      window.location.href = resolveLoginRedirectUrl()
    }
  }, [session?.token])

  const value = useMemo(
    () => ({
      session,
      profile,
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
