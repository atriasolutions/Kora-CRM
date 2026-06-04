import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { checkDatabaseConnection } from './db/pool.js'
import { authSessionMiddleware } from './middleware/auth-session.js'
import { errorHandler } from './middleware/errors.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  )
  // Las imágenes del producto se envían como data URL (base64), que crece ~33%.
  // 2 MB binarios pueden superar 2 MB en JSON; dejamos margen seguro.
  app.use(express.json({ limit: '6mb' }))

  app.get('/health', async (_req, res) => {
    try {
      const dbOk = await checkDatabaseConnection()
      res.json({ status: 'ok', database: dbOk ? 'connected' : 'error' })
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' })
    }
  })

  app.use('/api/v1', authSessionMiddleware, apiRouter)

  app.use(errorHandler)

  return app
}
