import { EmailAttachmentsField } from '@/components/contacts/EmailAttachmentsField'
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor'
import { Input } from '@/components/ui/input'
import type { ContactEmailAttachment } from '@/data/contact-emails.mock'

type ContactEmailComposeProps = {
  contactName: string
  contactEmail: string
  mode: 'new' | 'reply'
  subject: string
  onSubjectChange: (value: string) => void
  bodyHtml: string
  onBodyChange: (html: string) => void
  attachments: ContactEmailAttachment[]
  onAttachmentsChange: (files: ContactEmailAttachment[]) => void
  attachmentError: string | null
  onAttachmentError: (message: string | null) => void
  disabled?: boolean
}

export function ContactEmailCompose({
  contactName,
  contactEmail,
  mode,
  subject,
  onSubjectChange,
  bodyHtml,
  onBodyChange,
  attachments,
  onAttachmentsChange,
  attachmentError,
  onAttachmentError,
  disabled = false,
}: ContactEmailComposeProps) {
  const firstName = contactName.split(' ')[0] ?? contactName

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="compose-to"
          className="text-xs font-medium text-muted-foreground"
        >
          Para
        </label>
        <Input
          id="compose-to"
          value={contactEmail}
          readOnly
          className="h-9 bg-muted/40"
        />
      </div>

      {mode === 'new' ? (
        <div className="space-y-2">
          <label
            htmlFor="compose-subject"
            className="text-xs font-medium text-muted-foreground"
          >
            Asunto
          </label>
          <Input
            id="compose-subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Asunto del correo"
            className="h-9"
            disabled={disabled}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Asunto:{' '}
          <span className="font-medium text-foreground">{subject}</span>
        </p>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Mensaje
        </label>
        <RichTextEditor
          value={bodyHtml}
          onChange={onBodyChange}
          disabled={disabled}
          placeholder="Escribe el correo… Usa @ para personas o registros, como en las notas."
        />
      </div>

      <EmailAttachmentsField
        attachments={attachments}
        onChange={onAttachmentsChange}
        disabled={disabled}
        error={attachmentError}
        onError={onAttachmentError}
      />

      <p className="text-xs text-muted-foreground">
        Tip: puedes pegar la URL de un contacto, empresa o cotización después de{' '}
        <span className="font-medium text-foreground">@</span> para insertar la
        referencia ({firstName}).
      </p>
    </div>
  )
}
