import { pool } from '../db/pool.js'
import type { AuditActor } from '../types/audit.js'
import type { NotificationType } from '../types/notification.js'
import * as notificationsRepo from '../repositories/notifications.repository.js'
import {
  broadcastNotification,
  broadcastToUser,
} from '../realtime/notifications-ws.js'

async function resolveActiveUserIdByName(name: string): Promise<string | null> {
  const normalized = name.trim()
  if (!normalized) return null
  const result = await pool.query<{ id: string }>(
    `SELECT id
     FROM crm_users
     WHERE deleted_at IS NULL
       AND status = 'Activo'
       AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [normalized],
  )
  return result.rows[0]?.id ?? null
}

export async function notifyByUserId(userId: string, input: {
  type: NotificationType
  title: string
  message: string
  href?: string
  entityType?: string
  entityId?: string
}): Promise<void> {
  const created = await notificationsRepo.createNotification({
    userId,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href,
    entityType: input.entityType,
    entityId: input.entityId,
  })
  broadcastNotification(userId, created)
}

export async function broadcastActivitiesRefreshForUserName(
  name: string,
): Promise<void> {
  const userId = await resolveActiveUserIdByName(name)
  if (!userId) return
  broadcastToUser(userId, { type: 'activities:updated' })
}

export function broadcastInventoryUpdated(userId: string): void {
  if (!userId.trim()) return
  broadcastToUser(userId, { type: 'inventory:updated' })
}

export async function notifyByUserName(name: string, input: {
  type: NotificationType
  title: string
  message: string
  href?: string
  entityType?: string
  entityId?: string
}): Promise<void> {
  const userId = await resolveActiveUserIdByName(name)
  if (!userId) return
  await notifyByUserId(userId, input)
}

export async function notifyAssignment(params: {
  actor: AuditActor
  assigneeName: string
  activityId: string
  activityTitle: string
}): Promise<void> {
  const assigneeName = params.assigneeName?.trim()
  if (!assigneeName) return
  await notifyRecordOwnerAssignment({
    actor: params.actor,
    assigneeName,
    moduleLabel: 'la actividad',
    recordTitle: params.activityTitle,
    href: `/actividades/${params.activityId}`,
    entityType: 'actividad',
    entityId: params.activityId,
  })
}

export async function notifyRecordOwnerAssignment(params: {
  actor: AuditActor
  assigneeName: string
  moduleLabel: string
  recordTitle: string
  href: string
  entityType: string
  entityId: string
}): Promise<void> {
  const assigneeName = params.assigneeName?.trim()
  if (!assigneeName) return
  if (isSamePersonName(assigneeName, params.actor.userName)) return
  await notifyByUserName(assigneeName, {
    type: 'assignment',
    title: 'Te asignaron un registro',
    message: `${params.actor.userName} te asignó ${params.moduleLabel}: ${params.recordTitle}`,
    href: params.href,
    entityType: params.entityType,
    entityId: params.entityId,
  })
}

function isSamePersonName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Notifica al gerente de proyecto (usuario activo con el mismo nombre en CRM). */
export async function notifyProjectAssignment(params: {
  actor: AuditActor
  managerName: string
  projectId: string
  projectName: string
}): Promise<void> {
  const managerName = params.managerName?.trim()
  if (!managerName) return
  if (isSamePersonName(managerName, params.actor.userName)) return

  await notifyByUserName(managerName, {
    type: 'assignment',
    title: 'Te asignaron un proyecto',
    message: `Se te asignó el proyecto: ${params.projectName}`,
    href: `/proyectos/${params.projectId}`,
    entityType: 'proyecto',
    entityId: params.projectId,
  })
}

const ALERT_INVENTORY_STATUSES = new Set(['Stock bajo', 'Quiebre de stock', 'Sin stock'])

function inventoryDetailHref(positionId: string, sku: string): string {
  const normalized = sku.trim().toLowerCase()
  if (normalized) {
    return `/inventario/sku-${encodeURIComponent(normalized)}`
  }
  return `/inventario/${positionId}`
}

async function resolveInventoryNotifyUserIds(
  inventoryPositionId: string,
  actorUserId: string,
): Promise<string[]> {
  const result = await pool.query<{
    owner_name: string | null
    created_by_name: string | null
  }>(
    `SELECT pr.owner_name, pr.created_by_name
     FROM crm_inventory_positions ip
     LEFT JOIN crm_products pr ON pr.id = ip.product_id
     WHERE ip.id = $1`,
    [inventoryPositionId],
  )
  const row = result.rows[0]
  const ids = new Set<string>()
  if (actorUserId) ids.add(actorUserId)
  for (const name of [row?.owner_name, row?.created_by_name]) {
    const trimmed = name?.trim()
    if (!trimmed) continue
    const userId = await resolveActiveUserIdByName(trimmed)
    if (userId) ids.add(userId)
  }
  return [...ids]
}

/** Notifica si el estado operativo de inventario cambió hacia una alerta. */
export async function maybeNotifyInventoryStatusChange(params: {
  actor: AuditActor
  inventoryPositionId: string
  productName: string
  warehouseName: string
  sku: string
  previousStatus: string | null | undefined
  nextStatus: string
}): Promise<void> {
  const prev = (params.previousStatus ?? '').trim()
  const next = params.nextStatus.trim()
  if (prev === next) return
  if (!ALERT_INVENTORY_STATUSES.has(next)) return

  await notifyStockTransition({
    actor: params.actor,
    inventoryPositionId: params.inventoryPositionId,
    productName: params.productName,
    warehouseName: params.warehouseName,
    sku: params.sku,
    nextStatus: next,
  })
}

export async function notifyStockTransition(params: {
  actor: AuditActor
  inventoryPositionId: string
  productName: string
  warehouseName: string
  sku: string
  nextStatus: string
}): Promise<void> {
  const normalized = params.nextStatus.trim()

  let type: NotificationType | null = null
  if (normalized === 'Stock bajo') type = 'stock_low'
  if (normalized === 'Quiebre de stock') type = 'stock_out'
  if (normalized === 'Sin stock') type = 'stock_out'
  if (!type) return

  const href = inventoryDetailHref(params.inventoryPositionId, params.sku)
  const message = `El inventario de ${params.productName} en ${params.warehouseName} quedó con estado: ${normalized}.`
  const payload = {
    type,
    title: 'Alerta de stock',
    message,
    href,
    entityType: 'inventario',
    entityId: params.inventoryPositionId,
  }

  const userIds = await resolveInventoryNotifyUserIds(
    params.inventoryPositionId,
    params.actor.userId,
  )
  await Promise.all(userIds.map((userId) => notifyByUserId(userId, payload)))
}

