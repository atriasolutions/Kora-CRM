import http from 'node:http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { attachNotificationsWS } from './realtime/notifications-ws.js'
import {
  startActivityReminderScheduler,
  stopActivityReminderScheduler,
} from './services/activity-reminders.service.js'
import {
  startArchivePurgeScheduler,
  stopArchivePurgeScheduler,
} from './services/archive-purge-scheduler.service.js'
import {
  startExchangeRatesScheduler,
  stopExchangeRatesScheduler,
} from './services/exchange-rates-scheduler.service.js'

const app = createApp()

const server = http.createServer(app)
attachNotificationsWS(server)
startActivityReminderScheduler()
startExchangeRatesScheduler()
startArchivePurgeScheduler()

server.listen(env.port, () => {
  console.log(`Kora API escuchando en http://localhost:${env.port}`)
  console.log(`  Health:  http://localhost:${env.port}/health`)
  console.log(`  API:     http://localhost:${env.port}/api/v1`)
  console.log(`  WS:      ws://localhost:${env.port}/ws?token=...`)
})

process.on('SIGINT', async () => {
  stopActivityReminderScheduler()
  stopExchangeRatesScheduler()
  stopArchivePurgeScheduler()
  await pool.end()
  server.close()
  process.exit(0)
})
