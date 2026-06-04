import {
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  PenLine,
  RefreshCw,
  Reply,
  Search,
  Send,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ContactEmailCompose } from '@/components/contacts/ContactEmailCompose'
import { EmailAttachmentsList } from '@/components/contacts/EmailAttachmentsField'
import { MentionChipsList } from '@/components/shared/MentionChipsList'
import { RichTextContent } from '@/components/shared/rich-text/RichTextContent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type {
  ContactEmailAttachment,
  ContactEmailMessage,
  ContactEmailThread,
} from '@/data/contact-emails.mock'
import {
  countUnreadEmails,
  getContactEmailThreads,
} from '@/data/contact-emails.mock'
import {
  markThreadAsRead,
  replyBodyHtmlStub,
  replySubject,
  sendNewThread,
  sendReplyToThread,
  simulateEmailSync,
} from '@/lib/contact-emails'
import { extractMentionsFromHtml, isNoteContentEmpty, resolveMentionLabel } from '@/lib/mentions'
import { sanitizeRichTextHtml } from '@/lib/rich-text-sanitize'
import { cn } from '@/lib/utils'

type ContactEmailsPanelProps = {
  contactName: string
  contactEmail: string
  disabled?: boolean
  onUnreadChange?: (count: number) => void
}

type MailboxFilter = 'all' | 'inbound' | 'outbound'

type ComposeMode = 'new' | 'reply'

type Feedback = {
  type: 'success' | 'info'
  message: string
}

function filterThreads(
  threads: ContactEmailThread[],
  filter: MailboxFilter,
): ContactEmailThread[] {
  if (filter === 'all') return threads
  return threads.filter((thread) =>
    thread.messages.some((m) => m.direction === filter),
  )
}

function resolveMessageAttachments(
  msg: ContactEmailMessage,
): ContactEmailAttachment[] {
  if (msg.attachments?.length) return msg.attachments
  if (msg.hasAttachments) {
    return [
      {
        id: `${msg.id}-legacy`,
        name: 'propuesta-business-2024.pdf',
        size: 2_450_000,
        mimeType: 'application/pdf',
      },
    ]
  }
  return []
}

function resolveMessageMentions(msg: ContactEmailMessage) {
  return (
    msg.mentions ??
    extractMentionsFromHtml(msg.body).map((m) => ({
      ...m,
      label: m.label || resolveMentionLabel(m.id),
    }))
  )
}

export function ContactEmailsPanel({
  contactName,
  contactEmail,
  disabled = false,
  onUnreadChange,
}: ContactEmailsPanelProps) {
  const [threads, setThreads] = useState<ContactEmailThread[]>(() =>
    getContactEmailThreads(contactEmail, contactName),
  )
  const [mailbox, setMailbox] = useState<MailboxFilter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('new')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBodyHtml, setComposeBodyHtml] = useState('')
  const [composeAttachments, setComposeAttachments] = useState<
    ContactEmailAttachment[]
  >([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    const initial = getContactEmailThreads(contactEmail, contactName)
    setThreads(initial)
    setSelectedId(initial[0]?.id ?? '')
    setComposeOpen(false)
    setFeedback(null)
  }, [contactEmail, contactName])

  const unreadTotal = countUnreadEmails(threads)

  useEffect(() => {
    onUnreadChange?.(unreadTotal)
  }, [unreadTotal, onUnreadChange])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const filtered = useMemo(() => {
    const byMailbox = filterThreads(threads, mailbox)
    const q = query.trim().toLowerCase()
    if (!q) return byMailbox
    return byMailbox.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.messages.some(
          (m) =>
            m.preview.toLowerCase().includes(q) ||
            m.fromName.toLowerCase().includes(q),
        ),
    )
  }, [threads, mailbox, query])

  const selected =
    filtered.find((t) => t.id === selectedId) ??
    threads.find((t) => t.id === selectedId) ??
    filtered[0] ??
    null

  const latestMessage = selected?.messages[selected.messages.length - 1]

  const resetComposeDraft = useCallback(() => {
    setComposeBodyHtml('')
    setComposeSubject('')
    setComposeAttachments([])
    setAttachmentError(null)
    setComposeError(null)
  }, [])

  const closeComposeModal = useCallback(() => {
    setComposeOpen(false)
    resetComposeDraft()
  }, [resetComposeDraft])

  const handleComposeOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setComposeOpen(true)
        return
      }
      if (!isSending) {
        closeComposeModal()
      }
    },
    [closeComposeModal, isSending],
  )

  const openComposeNew = useCallback(() => {
    setComposeMode('new')
    resetComposeDraft()
    setComposeOpen(true)
  }, [resetComposeDraft])

  const openComposeReply = useCallback(() => {
    if (!selected) return
    const fromName =
      selected.messages[selected.messages.length - 1]?.fromName ?? contactName
    setComposeMode('reply')
    setComposeSubject(replySubject(selected.subject))
    setComposeBodyHtml(replyBodyHtmlStub(fromName))
    setComposeAttachments([])
    setAttachmentError(null)
    setComposeError(null)
    setComposeOpen(true)
  }, [contactName, resetComposeDraft, selected])

  const handleSend = useCallback(() => {
    const subject = composeSubject.trim()
    const bodyHtml = sanitizeRichTextHtml(composeBodyHtml)
    const mentions = extractMentionsFromHtml(bodyHtml)

    if (composeMode === 'new' && !subject) {
      setComposeError('El asunto es obligatorio.')
      return
    }
    if (isNoteContentEmpty(bodyHtml)) {
      setComposeError('Escribe un mensaje antes de enviar.')
      return
    }
    if (attachmentError) return

    setComposeError(null)
    setIsSending(true)

    queueMicrotask(() => {
      let next = threads
      let targetThreadId = selectedId
      const payload = {
        to: contactEmail,
        bodyHtml,
        mentions,
        attachments:
          composeAttachments.length > 0 ? composeAttachments : undefined,
      }

      if (composeMode === 'reply' && selected) {
        next = sendReplyToThread(threads, selected.id, payload)
        targetThreadId = selected.id
        setFeedback({
          type: 'success',
          message: 'Respuesta enviada (simulación).',
        })
      } else {
        next = sendNewThread(threads, { ...payload, subject })
        targetThreadId = next[0]?.id ?? targetThreadId
        setFeedback({
          type: 'success',
          message: 'Correo enviado (simulación).',
        })
      }

      setThreads(next)
      setSelectedId(targetThreadId)
      setComposeOpen(false)
      resetComposeDraft()
      setIsSending(false)
      setMailbox('all')
    })
  }, [
    attachmentError,
    composeAttachments,
    composeBodyHtml,
    composeMode,
    composeSubject,
    contactEmail,
    resetComposeDraft,
    selected,
    selectedId,
    threads,
  ])

  const handleSync = useCallback(() => {
    if (isSyncing) return
    setIsSyncing(true)
    setFeedback(null)

    window.setTimeout(() => {
      const { threads: next, added } = simulateEmailSync(
        threads,
        contactEmail,
        contactName,
      )
      setThreads(next)
      if (added && next[0]) {
        setSelectedId(next[0].id)
      }
      setLastSyncedAt(
        new Date().toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
      setFeedback({
        type: added ? 'success' : 'info',
        message: added
          ? 'Bandeja sincronizada: llegó un correo nuevo.'
          : 'Bandeja actualizada.',
      })
      setIsSyncing(false)
    }, 900)
  }, [contactEmail, contactName, isSyncing, threads])

  const handleMarkRead = useCallback(() => {
    if (!selected) return
    const next = markThreadAsRead(threads, selected.id)
    setThreads(next)
    setFeedback({ type: 'info', message: 'Hilo marcado como leído.' })
  }, [selected, threads])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Modo demo.</span>{' '}
            Redactar, responder y sincronizar funcionan en esta maqueta; los
            mensajes se guardan solo en esta sesión.
          </p>
        </div>
        {lastSyncedAt ? (
          <span className="text-xs text-muted-foreground sm:shrink-0">
            Última sync: {lastSyncedAt}
          </span>
        ) : null}
      </div>

      {feedback ? (
        <div
          role="status"
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'border-border bg-muted/50 text-foreground',
          )}
        >
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          {feedback.message}
        </div>
      ) : null}

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="flex flex-col gap-0 p-0">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={openComposeNew}
              >
                <PenLine aria-hidden className="size-4" />
                Redactar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border"
                disabled={disabled || isSyncing}
                onClick={handleSync}
              >
                {isSyncing ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <RefreshCw aria-hidden className="size-4" />
                )}
                {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
              </Button>
              {unreadTotal > 0 ? (
                <Badge variant="secondary">{unreadTotal} sin leer</Badge>
              ) : null}
            </div>
            <div className="relative max-w-xs flex-1 sm:max-w-sm">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en correos…"
                className="h-9 bg-background pl-9 shadow-sm"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="flex border-b border-border px-4">
            {(
              [
                { id: 'all' as const, label: 'Todos', Icon: Inbox },
                { id: 'inbound' as const, label: 'Recibidos', Icon: Mail },
                { id: 'outbound' as const, label: 'Enviados', Icon: Send },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => setMailbox(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  mailbox === id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,280px)_1fr]">
            <ul className="max-h-[520px] overflow-y-auto border-b border-border lg:border-b-0 lg:border-e">
              {filtered.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay correos en esta vista.
                </li>
              ) : (
                filtered.map((thread) => {
                  const last = thread.messages[thread.messages.length - 1]!
                  const active = selected?.id === thread.id
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedId(thread.id)}
                        className={cn(
                          'flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-start transition-colors',
                          active ? 'bg-primary/5' : 'hover:bg-muted/50',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-sm',
                              thread.unreadCount > 0
                                ? 'font-semibold text-foreground'
                                : 'font-medium text-foreground',
                            )}
                          >
                            {last.fromName}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {thread.lastWhen}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'truncate text-sm',
                            thread.unreadCount > 0
                              ? 'font-medium text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {thread.subject}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {last.preview}
                        </p>
                        {thread.unreadCount > 0 ? (
                          <span className="mt-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>

            <div className="flex min-h-[320px] flex-col">
              {selected && latestMessage ? (
                <>
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-base font-semibold text-foreground">
                      {selected.subject}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selected.messages.length} mensaje
                      {selected.messages.length === 1 ? '' : 's'} · Último:{' '}
                      {selected.lastWhen}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-border"
                        disabled={disabled}
                        onClick={openComposeReply}
                      >
                        <Reply aria-hidden className="size-4" />
                        Responder
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled || selected.unreadCount === 0}
                        onClick={handleMarkRead}
                      >
                        <MailOpen aria-hidden className="size-4" />
                        Marcar leído
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    {selected.messages.map((msg) => (
                      <article
                        key={msg.id}
                        className={cn(
                          'rounded-lg border p-4 text-sm',
                          msg.direction === 'outbound'
                            ? 'border-primary/20 bg-primary/5 ms-4 sm:ms-8'
                            : 'border-border bg-card me-4 sm:me-8',
                          msg.direction === 'inbound' &&
                            !msg.read &&
                            'ring-1 ring-primary/20',
                        )}
                      >
                        <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {msg.fromName}
                              {msg.direction === 'inbound' && !msg.read ? (
                                <Badge
                                  variant="secondary"
                                  className="ms-2 align-middle text-[10px]"
                                >
                                  Nuevo
                                </Badge>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {msg.direction === 'outbound' ? 'Para' : 'De'}:{' '}
                              {msg.direction === 'outbound'
                                ? msg.to.join(', ')
                                : msg.from}
                            </p>
                          </div>
                          <time className="text-xs text-muted-foreground">
                            {msg.when}
                          </time>
                        </header>
                        <RichTextContent html={msg.body} />
                        <MentionChipsList mentions={resolveMessageMentions(msg)} />
                        <EmailAttachmentsList
                          attachments={resolveMessageAttachments(msg)}
                        />
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <Inbox
                    aria-hidden
                    className="size-10 text-muted-foreground/60"
                  />
                  <p className="text-sm text-muted-foreground">
                    Selecciona un hilo para ver el contenido.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={composeOpen} onOpenChange={handleComposeOpenChange}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>
              {composeMode === 'reply' ? 'Responder' : 'Redactar correo'}
            </DialogTitle>
            <DialogDescription>
              {composeMode === 'reply'
                ? `Respuesta a ${contactName} (${contactEmail})`
                : `Nuevo mensaje para ${contactName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ContactEmailCompose
              contactName={contactName}
              contactEmail={contactEmail}
              mode={composeMode}
              subject={composeSubject}
              onSubjectChange={setComposeSubject}
              bodyHtml={composeBodyHtml}
              onBodyChange={setComposeBodyHtml}
              attachments={composeAttachments}
              onAttachmentsChange={setComposeAttachments}
              attachmentError={attachmentError}
              onAttachmentError={setAttachmentError}
              disabled={disabled || isSending}
            />
            {composeError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {composeError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSending}
              onClick={closeComposeModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={disabled || isSending}
              onClick={handleSend}
            >
              {isSending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Send aria-hidden className="size-4" />
              )}
              {isSending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
