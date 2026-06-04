import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

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
import type { AccessProfile } from '@/types/access-profile'

const useApi = isApiEnabled()

function sessionFromLogin(
  token: string,
  user: { id: string; email: string; name: string; profileId: string },
): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    token,
    profileId: user.profileId,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession())
  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [isReady, setIsReady] = useState(!useApi)

  useEffect(() => {
    if (!useApi) return

    const stored = loadAuthSession()
    if (!stored?.token) {
      setIsReady(true)
      return
    }

    let cancelled = false
    void fetchMeApi()
      .then(({ user, profile: meProfile }) => {
        if (cancelled) return
        const next = sessionFromLogin(stored.token!, {
          id: user.id,
          email: user.email,
          name: user.name,
          profileId: user.profileId,
        })
        saveAuthSession(next)
        setSession(next)
        setProfile(meProfile)
      })
      .catch(() => {
        if (cancelled) return
        clearAuthSession()
        setSession(null)
        setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setIsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const applyLoginSession = useCallback(
    (token: string, user: { id: string; email: string; name: string; profileId: string }, meProfile: AccessProfile) => {
      const next = sessionFromLogin(token, {
        id: user.id,
        email: user.email,
        name: user.name,
        profileId: user.profileId,
      })
      saveAuthSession(next)
      setSession(next)
      setProfile(meProfile)
    },
    [],
  )

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return { status: 'error', message: 'Indica tu correo electrónico.' }
    if (!password) return { status: 'error', message: 'Indica tu contraseña.' }

    if (useApi) {
      try {
        const result = await loginApi(normalizedEmail, password)
        if (result.kind === 'verify') {
          return {
            status: 'verify',
            challengeId: result.challengeId,
            userEmail: result.user.email,
          }
        }
        if (result.kind === 'enroll') {
          return {
            status: 'enroll',
            enrollmentToken: result.enrollmentToken,
            userEmail: result.user.email,
          }
        }
        applyLoginSession(result.token, result.user, result.profile)
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
  }, [applyLoginSession])

  const completeTwoFactorLogin = useCallback(
    async (challengeId: string, code: string): Promise<LoginOutcome> => {
      if (!useApi) return { status: 'error', message: '2FA no disponible en modo demo.' }
      try {
        const result = await verifyTwoFactorLoginApi(challengeId, code)
        applyLoginSession(result.token, result.user, result.profile)
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
    ): Promise<LoginOutcome & { backupCodes?: string[] }> => {
      if (!useApi) return { status: 'error', message: '2FA no disponible en modo demo.' }
      try {
        const result = await confirmEnrollmentLoginApi(enrollmentToken, code, setupId)
        applyLoginSession(result.token, result.user, result.profile)
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
      const { profile: meProfile } = await fetchMeApi()
      setProfile(meProfile)
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
