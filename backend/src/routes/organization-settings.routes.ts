import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { forbidden } from '../middleware/errors.js'
import { requirePermission } from '../middleware/require-permission.js'
import * as orgRepo from '../repositories/organization-settings.repository.js'
import { updateOrganizationSettingsSchema } from '../validators/settings.validator.js'

export const organizationSettingsRouter = Router()

organizationSettingsRouter.get('/', async (_req, res, next) => {
  try {
    const data = await orgRepo.getOrganizationSettings()
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

organizationSettingsRouter.patch(
  '/',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateOrganizationSettingsSchema.parse(req.body)
      const actor = getAuditActor(req)
      if (
        !actor.isPlatformOperator &&
        (body.invoicingMode !== undefined || body.economicActivityCode !== undefined)
      ) {
        throw forbidden(
          'Solo el operador de plataforma puede cambiar la facturación electrónica SII.',
        )
      }
      const data = await orgRepo.updateOrganizationSettings(body)
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)
