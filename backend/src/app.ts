import cors from 'cors'
import express from 'express'

import { isAllowedCorsOrigin } from './lib/cors-origins.js'
import { checkDatabaseConnection } from './db/pool.js'
import { authSessionMiddleware } from './middleware/auth-session.js'
import { errorHandler } from './middleware/errors.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, true)
          return
        }
        callback(null, false)
      },
      credentials: true,
    }),
  )
  // Archivos e imágenes viajan como data URL (base64, ~+33%). Hasta 30 × 10 MB por registro.
  app.use(express.json({ limit: '64mb' }))

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
