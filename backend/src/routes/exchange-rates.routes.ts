import { Router } from 'express'

import { requirePermission } from '../middleware/require-permission.js'
import {
  getPublicExchangeRates,
  getStoredExchangeRates,
  syncExchangeRatesForDate,
} from '../services/exchange-rates.service.js'
import { syncExchangeRatesSchema } from '../validators/exchange-rates.validator.js'

export const exchangeRatesRouter = Router()

exchangeRatesRouter.get('/', async (req, res, next) => {
  try {
    const date =
      typeof req.query.date === 'string' ? req.query.date : undefined
    const rates = await getPublicExchangeRates(date)
    if (!rates) {
      res.status(503).json({ error: 'No hay tipos de cambio disponibles' })
      return
    }
    res.json({ data: rates })
  } catch (error) {
    next(error)
  }
})

exchangeRatesRouter.get('/stored', async (req, res, next) => {
  try {
    const date =
      typeof req.query.date === 'string' ? req.query.date : undefined
    const rates = await getStoredExchangeRates(date)
    if (!rates) {
      res.status(404).json({
        error: 'No hay indicadores almacenados para esta fecha',
      })
      return
    }
    res.json({ data: rates })
  } catch (error) {
    next(error)
  }
})

exchangeRatesRouter.post(
  '/sync',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = syncExchangeRatesSchema.parse(req.body ?? {})
      const rates = await syncExchangeRatesForDate(body.rateDate)
      res.json({ data: rates })
    } catch (error) {
      next(error)
    }
  },
)

exchangeRatesRouter.get('/today', async (_req, res, next) => {
  try {
    const rates = await getPublicExchangeRates()
    if (!rates) {
      res.status(503).json({ error: 'No hay tipos de cambio disponibles' })
      return
    }
    res.json({ data: rates })
  } catch (error) {
    next(error)
  }
})
