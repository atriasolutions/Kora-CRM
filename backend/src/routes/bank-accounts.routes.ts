import { Router } from 'express'

import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as bankAccountsRepo from '../repositories/bank-accounts.repository.js'
import {
  createBankAccountSchema,
  updateBankAccountSchema,
} from '../validators/bank-account.validator.js'

export const bankAccountsRouter = Router()

bankAccountsRouter.get(
  '/',
  requirePermission('cotizaciones', 'view'),
  async (_req, res, next) => {
    try {
      const data = await bankAccountsRepo.listBankAccounts()
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

bankAccountsRouter.get(
  '/:id',
  requirePermission('cotizaciones', 'view'),
  async (req, res, next) => {
    try {
      const data = await bankAccountsRepo.getBankAccountById(routeParam(req))
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

bankAccountsRouter.post(
  '/',
  requirePermission('configuracion', 'create'),
  async (req, res, next) => {
    try {
      const body = createBankAccountSchema.parse(req.body)
      const data = await bankAccountsRepo.createBankAccount(body)
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

bankAccountsRouter.patch(
  '/:id',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateBankAccountSchema.parse(req.body)
      const data = await bankAccountsRepo.updateBankAccount(routeParam(req), body)
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

bankAccountsRouter.delete(
  '/:id',
  requirePermission('configuracion', 'delete'),
  async (req, res, next) => {
    try {
      await bankAccountsRepo.deleteBankAccount(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
