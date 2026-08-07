import {
  getWebPushVapidPublicKeyApi,
  subscribeWebPushApi,
  unsubscribeWebPushApi,
} from '@/api/notifications'
import { isApiEnabled } from '@/api/config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

/** Solo Android (Chrome / PWA). Escritorio e iOS no deben registrar push. */
export function isAndroidMobilePushClient(userAgent = navigator.userAgent): boolean {
  if (!/Android/i.test(userAgent)) return false
  // Excluye emuladores de escritorio raros y escritorio disfrazado
  if (/Windows NT|Macintosh|CrOS|X11/i.test(userAgent) && !/Android/i.test(userAgent)) {
    return false
  }
  return true
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isWebPushSupported()) return 'unsupported'
  return Notification.permission
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  const registration = await getReadyRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export async function enableWebPush(): Promise<PushSubscription> {
  if (!isApiEnabled()) {
    throw new Error('Las notificaciones push requieren conexión con la API.')
  }
  if (!isAndroidMobilePushClient()) {
    throw new Error(
      'Las notificaciones push solo se pueden activar desde Android (Chrome o la app instalada).',
    )
  }
  if (!isWebPushSupported()) {
    throw new Error('Este navegador o dispositivo no soporta Web Push.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Debes permitir notificaciones en el sistema para activar el push.')
  }

  const registration = await getReadyRegistration()
  if (!registration) {
    throw new Error(
      'El service worker aún no está listo. Instala la app o recarga y vuelve a intentar.',
    )
  }

  // Renueva siempre: evita claves VAPID viejas / suscripciones de otra sesión
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    if (isApiEnabled()) {
      try {
        await unsubscribeWebPushApi(existing.endpoint)
      } catch {
        /* best-effort */
      }
    }
    await existing.unsubscribe().catch(() => {})
  }

  const publicKey = await getWebPushVapidPublicKeyApi()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('No se pudo leer la suscripción push del navegador.')
  }

  await subscribeWebPushApi({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  })

  return subscription
}

export async function disableWebPush(): Promise<void> {
  const subscription = await getActivePushSubscription()
  if (!subscription) return

  if (isApiEnabled()) {
    try {
      await unsubscribeWebPushApi(subscription.endpoint)
    } catch {
      /* best-effort */
    }
  }
  await subscription.unsubscribe()
}

/** Re-sincroniza solo en Android si el permiso ya está concedido. */
export async function syncWebPushIfGranted(): Promise<void> {
  if (!isApiEnabled() || !isWebPushSupported()) return
  if (!isAndroidMobilePushClient()) return
  if (Notification.permission !== 'granted') return
  try {
    await enableWebPush()
  } catch {
    /* silent — no forzar al usuario en login */
  }
}
