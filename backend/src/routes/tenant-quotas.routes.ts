import { Router } from 'express'

import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { getAuditActor } from '../middleware/audit-actor.js'
import { forbidden } from '../middleware/errors.js'
import { requirePermission } from '../middleware/require-permission.js'
import { provisionBlankTenant } from '../services/tenant-lifecycle.service.js'
import {
  getQuotasForTenant,
  getUsageForTenant,
  updateQuotasForTenant,
} from '../services/tenant-quota.service.js'
import {
  destroyTenantCompletely,
  getTenantAdminMeta,
  truncateTenantRecords,
} from '../services/tenant-purge.service.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import {
  createTenantInstanceSchema,
  tenantDestructiveActionSchema,
  updateTenantQuotasSchema,
} from '../validators/tenant-quota.validator.js'

export const tenantQuotasRouter = Router()

function assertAtriaPlatformOperator(req: Parameters<typeof getAuditActor>[0]): void {
  const actor = getAuditActor(req)
  if (!actor.isPlatformOperator) {
    throw forbidden('Solo el operador de plataforma puede administrar instancias.')
  }
  if (actor.tenantId !== ATRIA_TENANT_ID) {
    throw forbidden('Las instancias nuevas solo se crean desde Atria Solutions.')
  }
}

tenantQuotasRouter.get('/quotas', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    if (!actor.isPlatformOperator) {
      next(forbidden('Solo el operador de plataforma puede consultar cuotas de instancia.'))
      return
    }
    const data = await getQuotasForTenant(getTenantIdOrDefault())
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

tenantQuotasRouter.put('/quotas', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    if (!actor.isPlatformOperator) {
      next(forbidden('Solo el operador de plataforma puede editar cuotas de instancia.'))
      return
    }
    const body = updateTenantQuotasSchema.parse(req.body)
    const data = await updateQuotasForTenant(getTenantIdOrDefault(), body, actor)
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

tenantQuotasRouter.post('/instances', async (req, res, next) => {
  try {
    assertAtriaPlatformOperator(req)
    const body = createTenantInstanceSchema.parse(req.body)
    const data = await provisionBlankTenant(body)
    res.status(201).json({ data })
  } catch (e) {
    next(e)
  }
})

tenantQuotasRouter.get('/admin-meta', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    if (!actor.isPlatformOperator) {
      next(forbidden('Solo el operador de plataforma puede administrar la instancia.'))
      return
    }
    const data = await getTenantAdminMeta(getTenantIdOrDefault())
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

tenantQuotasRouter.post('/truncate-records', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    if (!actor.isPlatformOperator) {
      next(forbidden('Solo el operador de plataforma puede vaciar registros de la instancia.'))
      return
    }
    const body = tenantDestructiveActionSchema.parse(req.body)
    const data = await truncateTenantRecords(getTenantIdOrDefault(), body.confirmSlug)
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

tenantQuotasRouter.post('/destroy', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    if (!actor.isPlatformOperator) {
      next(forbidden('Solo el operador de plataforma puede eliminar la instancia.'))
      return
    }
    const body = tenantDestructiveActionSchema.parse(req.body)
    const data = await destroyTenantCompletely(getTenantIdOrDefault(), body.confirmSlug)
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

tenantQuotasRouter.get(
  '/usage',
  requirePermission('configuracion', 'view'),
  async (req, res, next) => {
    try {
      const forceRefresh = req.query.refresh === '1'
      const data = await getUsageForTenant(getTenantIdOrDefault(), { forceRefresh })
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)
