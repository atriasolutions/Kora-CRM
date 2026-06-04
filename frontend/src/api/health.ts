import { apiBaseURL } from '@/api/client'
import { isApiEnabled } from '@/api/config'

/** Comprueba si el backend responde (endpoint /health). */
export async function checkApiReachable(): Promise<boolean> {
  if (!isApiEnabled()) return true

  const base = apiBaseURL()
  const healthUrl = base ? `${base}/health` : '/health'

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}
