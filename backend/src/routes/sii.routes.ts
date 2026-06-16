import { Router } from 'express'
import multer from 'multer'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission, requirePlatformOperator } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as siiCredential from '../services/sii-credential.service.js'
import * as siiRcv from '../services/sii-rcv.service.js'
import * as siiFolio from '../services/sii-folio.service.js'
import * as siiEmit from '../services/sii-emit.service.js'
import * as siiStatus from '../services/sii-status.service.js'
import {
  emitSiiSchema,
  listRcvQuerySchema,
  syncRcvSchema,
  uploadCafSchema,
  uploadSiiCredentialSchema,
} from '../validators/sii.validator.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

export const siiRouter = Router()

siiRouter.get(
  '/status',
  requirePlatformOperator(),
  requirePermission('configuracion', 'view'),
  async (_req, res, next) => {
    try {
      const data = await siiStatus.getSiiIntegrationStatus()
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.get(
  '/credentials',
  requirePlatformOperator(),
  requirePermission('configuracion', 'view'),
  async (_req, res, next) => {
    try {
      const data = await siiCredential.listSiiCredentials()
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.post(
  '/credentials',
  requirePlatformOperator(),
  requirePermission('configuracion', 'edit'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const file = req.file
      const body = uploadSiiCredentialSchema.parse({
        env: req.body.env ?? 'certification',
        label: req.body.label,
        certBase64: file
          ? file.buffer.toString('base64')
          : req.body.certBase64,
        certPassword: req.body.certPassword ?? req.body.password,
        portalRut: req.body.portalRut,
        portalPassword: req.body.portalPassword,
        consent: req.body.consent === true || req.body.consent === 'true',
      })
      const data = await siiCredential.upsertSiiCredential({
        ...body,
        actor: getAuditActor(req),
      })
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.delete(
  '/credentials/:id',
  requirePlatformOperator(),
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      await siiCredential.deleteSiiCredential(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.get(
  '/folios',
  requirePlatformOperator(),
  requirePermission('configuracion', 'view'),
  async (_req, res, next) => {
    try {
      const data = await siiFolio.listFolioRanges()
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.post(
  '/folios/upload',
  requirePlatformOperator(),
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = uploadCafSchema.parse(req.body)
      const data = await siiFolio.uploadCaf(body)
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.delete(
  '/folios/:id',
  requirePlatformOperator(),
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      await siiFolio.deactivateFolioRange(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.post(
  '/rcv/sync',
  requirePermission('facturacion', 'edit'),
  async (req, res, next) => {
    try {
      const body = syncRcvSchema.parse(req.body)
      const data = await siiRcv.syncRcvInvoices(body)
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.get(
  '/rcv',
  requirePermission('facturacion', 'view'),
  async (req, res, next) => {
    try {
      const query = listRcvQuerySchema.parse(req.query)
      const result = await siiRcv.listRcvInvoices(query)
      res.json({
        data: result.items,
        meta: { total: result.total },
      })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.post(
  '/invoices/:invoiceId/emit',
  requirePermission('facturacion', 'edit'),
  async (req, res, next) => {
    try {
      const body = emitSiiSchema.parse(req.body ?? {})
      const data = await siiEmit.emitInvoiceToSii(
        routeParam(req, 'invoiceId'),
        getAuditActor(req),
        body.env ?? 'certification',
      )
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

siiRouter.get(
  '/invoices/:invoiceId/dte-status',
  requirePermission('facturacion', 'view'),
  async (req, res, next) => {
    try {
      const data = await siiEmit.pollDteSubmissionStatus(routeParam(req, 'invoiceId'))
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)
