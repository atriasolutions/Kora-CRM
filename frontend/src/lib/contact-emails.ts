import type {
  ContactEmailAttachment,
  ContactEmailMessage,
  ContactEmailThread,
} from '@/data/contact-emails.mock'
import { extractMentionsFromHtml, type NoteMention } from '@/lib/mentions'
import { sanitizeRichTextHtml } from '@/lib/rich-text-sanitize'

export const DEMO_MAILBOX_OWNER = {
  email: 'maria.lopez@kora.app',
  name: 'María López',
  from: 'María López <maria.lopez@kora.app>',
} as const

export function formatEmailTimestamp(date = new Date()): string {
  return date.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatEmailListWhen(date = new Date()): string {
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return `Hoy, ${date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return `Ayer, ${date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  return formatEmailTimestamp(date)
}

export function plainTextToEmailHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return '<p></p>'
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) =>
        line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;'),
      )
      return `<p>${lines.join('<br/>')}</p>`
    })
    .join('')
}

export function previewFromPlainText(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1)}…`
}

export function previewFromHtml(html: string, max = 120): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return previewFromPlainText(text, max)
}

export function replySubject(subject: string): string {
  const trimmed = subject.trim()
  if (/^re:/i.test(trimmed)) return trimmed
  return `Re: ${trimmed}`
}

export function replyBodyHtmlStub(fromName: string): string {
  return `<p></p><p><br/></p><p>---</p><p>En respuesta a ${fromName}:</p>`
}

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function createThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function recomputeThreadMeta(
  thread: ContactEmailThread,
): ContactEmailThread {
  const last = thread.messages[thread.messages.length - 1]
  return {
    ...thread,
    lastWhen: last?.when ?? thread.lastWhen,
    unreadCount: thread.messages.filter(
      (m) => m.direction === 'inbound' && !m.read,
    ).length,
  }
}

export function buildOutboundMessage(input: {
  to: string[]
  subject: string
  bodyHtml: string
  mentions?: NoteMention[]
  attachments?: ContactEmailAttachment[]
  when?: Date
}): ContactEmailMessage {
  const whenDate = input.when ?? new Date()
  const body = sanitizeRichTextHtml(input.bodyHtml)
  const preview = previewFromHtml(body)
  const attachments = input.attachments ?? []

  return {
    id: createMessageId(),
    direction: 'outbound',
    from: DEMO_MAILBOX_OWNER.from,
    fromName: DEMO_MAILBOX_OWNER.name,
    to: input.to,
    subject: input.subject.trim(),
    preview,
    body,
    when: formatEmailTimestamp(whenDate),
    read: true,
    mentions: input.mentions ?? extractMentionsFromHtml(body),
    attachments: attachments.length > 0 ? attachments : undefined,
    hasAttachments: attachments.length > 0,
  }
}

export type SendEmailPayload = {
  to: string
  subject: string
  bodyHtml: string
  mentions?: NoteMention[]
  attachments?: ContactEmailAttachment[]
}

export function sendNewThread(
  threads: ContactEmailThread[],
  input: SendEmailPayload,
): ContactEmailThread[] {
  const subject = input.subject.trim()
  const message = buildOutboundMessage({
    to: [input.to],
    subject,
    bodyHtml: input.bodyHtml,
    mentions: input.mentions,
    attachments: input.attachments,
  })

  const thread: ContactEmailThread = recomputeThreadMeta({
    id: createThreadId(),
    subject,
    messages: [message],
    lastWhen: message.when,
    unreadCount: 0,
  })

  return [thread, ...threads]
}

export function sendReplyToThread(
  threads: ContactEmailThread[],
  threadId: string,
  input: Omit<SendEmailPayload, 'subject'>,
): ContactEmailThread[] {
  return threads.map((thread) => {
    if (thread.id !== threadId) return thread

    const subject = replySubject(thread.subject)
    const message = buildOutboundMessage({
      to: [input.to],
      subject,
      bodyHtml: input.bodyHtml,
      mentions: input.mentions,
      attachments: input.attachments,
    })

    return recomputeThreadMeta({
      ...thread,
      subject,
      messages: [...thread.messages, message],
    })
  })
}

export function markThreadAsRead(
  threads: ContactEmailThread[],
  threadId: string,
): ContactEmailThread[] {
  return threads.map((thread) => {
    if (thread.id !== threadId) return thread
    return recomputeThreadMeta({
      ...thread,
      messages: thread.messages.map((m) =>
        m.direction === 'inbound' ? { ...m, read: true } : m,
      ),
    })
  })
}

/** Simula llegada de un correo entrante tras sincronizar. */
export function simulateEmailSync(
  threads: ContactEmailThread[],
  contactEmail: string,
  contactName: string,
): { threads: ContactEmailThread[]; added: boolean } {
  const now = new Date()
  const inbound: ContactEmailMessage = {
    id: createMessageId(),
    direction: 'inbound',
    from: contactEmail,
    fromName: contactName,
    to: [DEMO_MAILBOX_OWNER.email],
    subject: 'Re: Seguimiento comercial',
    preview: 'Hola María, ¿podemos agendar una llamada esta semana?',
    body: `<p>Hola María,</p><p>¿Podemos agendar una llamada esta semana para revisar los pendientes?</p><p>Saludos,<br/>${contactName.split(' ')[0]}</p>`,
    when: formatEmailTimestamp(now),
    read: false,
  }

  const existingIdx = threads.findIndex((t) =>
    t.subject.toLowerCase().includes('seguimiento comercial'),
  )

  if (existingIdx >= 0) {
    const updated = [...threads]
    const target = updated[existingIdx]!
    updated[existingIdx] = recomputeThreadMeta({
      ...target,
      messages: [...target.messages, inbound],
      lastWhen: formatEmailListWhen(now),
    })
    const [moved] = updated.splice(existingIdx, 1)
    return { threads: [moved!, ...updated], added: true }
  }

  const thread: ContactEmailThread = recomputeThreadMeta({
    id: createThreadId(),
    subject: 'Seguimiento comercial',
    messages: [inbound],
    lastWhen: formatEmailListWhen(now),
    unreadCount: 1,
  })

  return { threads: [thread, ...threads], added: true }
}
