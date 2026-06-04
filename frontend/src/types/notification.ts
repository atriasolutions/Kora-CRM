export type NotificationType =
  | 'mention'
  | 'assignment'
  | 'stock_low'
  | 'stock_out'

export type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  message: string
  href?: string
  entityType?: string
  entityId?: string
  createdAt: string
  readAt?: string
}

export type NotificationListResponse = {
  items: NotificationItem[]
  unreadCount: number
}

