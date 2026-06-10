export type NotificationType =
  | 'mention'
  | 'assignment'
  | 'stock_low'
  | 'stock_out'
  | 'quota_warning'

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  href?: string
  entityType?: string
  entityId?: string
  createdAt: string
  readAt?: string
}

export type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  href?: string
  entityType?: string
  entityId?: string
}

export type NotificationWsMessage = {
  type: 'notification'
  data: Notification
}

