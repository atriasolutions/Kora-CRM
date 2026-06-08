import { env } from '../config/env.js'
import { sendMail } from './mail.service.js'
import { createAtriaProspectFromTrialLead } from './marketing-prospect.service.js'
import { provisionTrialFromLead } from './tenant-lifecycle.service.js'
import type { SupportRequestInput, TrialLeadInput } from '../validators/marketing.validator.js'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type TrialLeadSubmissionResult = {
  received: boolean
  emailed: boolean
  companyId: string
  contactId: string
  trial: {
    provisioned: boolean
    slug?: string
    loginUrl?: string
    trialDays?: number
    welcomeEmailed?: boolean
    error?: string
  }
}

export async function submitTrialLead(
  input: TrialLeadInput,
): Promise<TrialLeadSubmissionResult> {
  const crm = await createAtriaProspectFromTrialLead(input)

  let trial: TrialLeadSubmissionResult['trial'] = { provisioned: false }
  if (env.marketingAutoProvisionTrial) {
    trial = await provisionTrialFromLead({
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      contactId: crm.contactId,
    })
  }

  const to = env.marketingLeadTo
  const subject = `[Kora CRM] Prueba gratis — ${input.company.trim()}`
  const lines = [
    `Contacto: ${input.name.trim()}`,
    `Empresa: ${input.company.trim()}`,
    `RUT: ${input.rut.trim()}`,
    `Empleados: ${input.employees.trim()}`,
    `Dirección: ${input.address.trim()}`,
    `Región: ${input.region.trim()}`,
    `Comuna: ${input.commune.trim()}`,
    `Email: ${input.email.trim()}`,
    `Teléfono: ${input.phone.trim()}`,
    input.message?.trim() ? `\nMensaje:\n${input.message.trim()}` : null,
    `\nCRM Atria · Origen: ${env.marketingLeadSource} · Asignado a: ${env.marketingLeadOwnerName}`,
    `\nCRM Atria: empresa ${crm.companyId}${crm.createdCompany ? ' (nueva)' : ' (existente)'} · contacto ${crm.contactId}${crm.createdContact ? ' (nuevo)' : ' (existente)'}`,
    trial.provisioned && trial.loginUrl
      ? `\nDemo auto-provisionada: ${trial.loginUrl}${trial.slug ? ` (slug: ${trial.slug})` : ''}`
      : trial.error
        ? `\nDemo NO provisionada: ${trial.error}`
        : null,
  ].filter(Boolean)

  const text = lines.join('\n')
  const trialHtmlBlock = trial.provisioned && trial.loginUrl
    ? `<p style="font-family:sans-serif;color:#334155;"><strong>Demo auto-provisionada:</strong> <a href="${escapeHtml(trial.loginUrl)}">${escapeHtml(trial.loginUrl)}</a></p>`
    : trial.error
      ? `<p style="font-family:sans-serif;color:#b91c1c;"><strong>Demo no provisionada:</strong> ${escapeHtml(trial.error)}</p>`
      : ''

  const html = `
    <h2 style="font-family:sans-serif;color:#1e293b;">Nueva solicitud de prueba gratis</h2>
    <ul style="font-family:sans-serif;color:#334155;line-height:1.6;">
      <li><strong>Contacto:</strong> ${escapeHtml(input.name.trim())}</li>
      <li><strong>Empresa:</strong> ${escapeHtml(input.company.trim())}</li>
      <li><strong>RUT:</strong> ${escapeHtml(input.rut.trim())}</li>
      <li><strong>Empleados:</strong> ${escapeHtml(input.employees.trim())}</li>
      <li><strong>Dirección:</strong> ${escapeHtml(input.address.trim())}</li>
      <li><strong>Región:</strong> ${escapeHtml(input.region.trim())}</li>
      <li><strong>Comuna:</strong> ${escapeHtml(input.commune.trim())}</li>
      <li><strong>Email:</strong> ${escapeHtml(input.email.trim())}</li>
      <li><strong>Teléfono:</strong> ${escapeHtml(input.phone.trim())}</li>
    </ul>
    ${
      input.message?.trim()
        ? `<p style="font-family:sans-serif;color:#334155;"><strong>Mensaje:</strong><br/>${escapeHtml(input.message.trim()).replace(/\n/g, '<br/>')}</p>`
        : ''
    }
    ${trialHtmlBlock}
    <p style="font-family:sans-serif;color:#64748b;font-size:13px;">
      Registrado en Atria Solutions como prospecto (empresa + contacto).
    </p>
  `

  const emailed = await sendMail({
    to,
    subject,
    text,
    html,
    category: 'marketing_trial_lead',
  })

  return {
    received: true,
    emailed,
    companyId: crm.companyId,
    contactId: crm.contactId,
    trial,
  }
}

const SUPPORT_TOPIC_LABELS: Record<SupportRequestInput['topic'], string> = {
  technical: 'Problema técnico',
  access: 'Acceso o cuenta',
  usage: 'Uso del CRM',
  billing: 'Plan o facturación',
  other: 'Otra consulta',
}

export async function submitSupportRequest(
  input: SupportRequestInput,
): Promise<{ received: boolean; emailed: boolean }> {
  const to = env.marketingLeadTo
  const topicLabel = SUPPORT_TOPIC_LABELS[input.topic]
  const subject = `[Kora CRM] Soporte — ${topicLabel}${input.company?.trim() ? ` — ${input.company.trim()}` : ''}`
  const lines = [
    `Nombre: ${input.name.trim()}`,
    `Email: ${input.email.trim()}`,
    input.company?.trim() ? `Empresa: ${input.company.trim()}` : null,
    `Motivo: ${topicLabel}`,
    `\nMensaje:\n${input.message.trim()}`,
  ].filter(Boolean)

  const text = lines.join('\n')
  const html = `
    <h2 style="font-family:sans-serif;color:#1e293b;">Nueva consulta de soporte</h2>
    <ul style="font-family:sans-serif;color:#334155;line-height:1.6;">
      <li><strong>Nombre:</strong> ${escapeHtml(input.name.trim())}</li>
      <li><strong>Email:</strong> ${escapeHtml(input.email.trim())}</li>
      ${input.company?.trim() ? `<li><strong>Empresa:</strong> ${escapeHtml(input.company.trim())}</li>` : ''}
      <li><strong>Motivo:</strong> ${escapeHtml(topicLabel)}</li>
    </ul>
    <p style="font-family:sans-serif;color:#334155;"><strong>Mensaje:</strong><br/>${escapeHtml(input.message.trim()).replace(/\n/g, '<br/>')}</p>
  `

  const emailed = await sendMail({
    to,
    subject,
    text,
    html,
    category: 'marketing_support_request',
  })

  return { received: true, emailed }
}
