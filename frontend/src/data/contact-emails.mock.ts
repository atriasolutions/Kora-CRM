import type { NoteMention } from '@/lib/mentions'

export type ContactEmailDirection = 'inbound' | 'outbound'

export type ContactEmailAttachment = {
  id: string
  name: string
  size: number
  mimeType?: string
}

export type ContactEmailMessage = {
  id: string
  direction: ContactEmailDirection
  from: string
  fromName: string
  to: string[]
  subject: string
  preview: string
  body: string
  when: string
  read: boolean
  mentions?: NoteMention[]
  attachments?: ContactEmailAttachment[]
  /** @deprecated Usar attachments.length */
  hasAttachments?: boolean
}

export type ContactEmailThread = {
  id: string
  subject: string
  messages: ContactEmailMessage[]
  lastWhen: string
  unreadCount: number
}

/** Hilos demo asociados al contacto (maqueta). */
export function getContactEmailThreads(
  contactEmail: string,
  contactName: string,
): ContactEmailThread[] {
  const owner = 'María López <maria.lopez@kora.app>'

  return [
    {
      id: 'thread-1',
      subject: 'Re: Propuesta plan Business — Tech Solutions',
      lastWhen: 'Hoy, 09:42',
      unreadCount: 1,
      messages: [
        {
          id: 'msg-1a',
          direction: 'outbound',
          from: owner,
          fromName: 'María López',
          to: [contactEmail],
          subject: 'Propuesta plan Business — Tech Solutions',
          preview:
            'Hola, adjunto la propuesta actualizada con descuento por volumen…',
          body: `<p>Hola ${contactName.split(' ')[0]},</p><p>Adjunto la propuesta actualizada con descuento por volumen acordado en la reunión del martes.</p><p>Quedo atenta a tus comentarios.</p><p>Saludos,<br/>María</p>`,
          when: '16 may, 14:10',
          read: true,
          hasAttachments: true,
          attachments: [
            {
              id: 'att-seed-1',
              name: 'propuesta-business-2024.pdf',
              size: 2_450_000,
              mimeType: 'application/pdf',
            },
          ],
        },
        {
          id: 'msg-1b',
          direction: 'inbound',
          from: contactEmail,
          fromName: contactName,
          to: ['maria.lopez@kora.app'],
          subject: 'Re: Propuesta plan Business — Tech Solutions',
          preview:
            'Gracias María, revisamos con finanzas y te confirmamos el viernes…',
          body: `<p>Gracias María,</p><p>Revisamos con finanzas y te confirmamos el viernes antes del mediodía.</p><p>${contactName}</p>`,
          when: 'Hoy, 09:42',
          read: false,
        },
      ],
    },
    {
      id: 'thread-2',
      subject: 'Invitación: demo ejecutiva Q3',
      lastWhen: 'Ayer, 16:05',
      unreadCount: 0,
      messages: [
        {
          id: 'msg-2a',
          direction: 'outbound',
          from: owner,
          fromName: 'María López',
          to: [contactEmail],
          subject: 'Invitación: demo ejecutiva Q3',
          preview: 'Te comparto el enlace de Teams y la agenda propuesta…',
          body: `<p>Hola,</p><p>Te comparto el enlace de Teams y la agenda propuesta para la demo del roadmap Q3.</p><p>¿Te acomoda el jueves 11:00?</p>`,
          when: 'Ayer, 16:05',
          read: true,
        },
      ],
    },
    {
      id: 'thread-3',
      subject: 'Documentación onboarding',
      lastWhen: '8 may, 11:20',
      unreadCount: 0,
      messages: [
        {
          id: 'msg-3a',
          direction: 'inbound',
          from: contactEmail,
          fromName: contactName,
          to: ['soporte@kora.app', 'maria.lopez@kora.app'],
          subject: 'Documentación onboarding',
          preview: '¿Podrían enviarme la guía de integración SSO otra vez?',
          body: `<p>Buenos días,</p><p>¿Podrían enviarme la guía de integración SSO otra vez? La perdí al cambiar de equipo.</p><p>Gracias.</p>`,
          when: '8 may, 11:20',
          read: true,
        },
        {
          id: 'msg-3b',
          direction: 'outbound',
          from: 'Soporte Kora <soporte@kora.app>',
          fromName: 'Soporte Kora',
          to: [contactEmail],
          subject: 'Re: Documentación onboarding',
          preview: 'Aquí va el enlace actualizado al portal de documentación…',
          body: `<p>Hola,</p><p>Aquí va el enlace actualizado al portal de documentación.</p><p>Equipo Soporte</p>`,
          when: '8 may, 15:40',
          read: true,
        },
      ],
    },
  ]
}

export function countUnreadEmails(threads: ContactEmailThread[]): number {
  return threads.reduce((sum, t) => sum + t.unreadCount, 0)
}
