/**
 * Prueba rápida de Mailtrap Sending API.
 * Uso: npm run mail:test
 */
import 'dotenv/config'

import nodemailer from 'nodemailer'
import { MailtrapTransport } from 'mailtrap'

import { env } from '../src/config/env.js'

const token = env.mailtrapToken.trim()
if (!token) {
  console.error('Falta MAILTRAP_TOKEN en backend/.env')
  process.exit(1)
}

const transport = nodemailer.createTransport(
  MailtrapTransport({
    token,
  }),
)

const to = process.argv[2]?.trim() || process.env.MAIL_OVERRIDE_TO || ''
if (!to) {
  console.error('Indica destinatario: npm run mail:test -- tu@correo.com')
  process.exit(1)
}

try {
  const info = await transport.sendMail({
    from: { address: env.mailFromAddress, name: env.mailFromName },
    to: [to],
    subject: 'Prueba Kora CRM — Mailtrap Sending',
    text: 'Si recibes este mensaje, la API de Mailtrap está configurada correctamente.',
    category: 'Integration Test',
  })
  console.log('Enviado:', info)
} catch (err) {
  console.error(err)
  process.exit(1)
}
