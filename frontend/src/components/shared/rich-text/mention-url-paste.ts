import type { Editor } from '@tiptap/core'

import { resolveMentionFromUrl } from '@/lib/mentions'

function mentionInsertAttrs(mention: NonNullable<ReturnType<typeof resolveMentionFromUrl>>) {
  return {
    id: mention.id,
    label: mention.label,
    mentionKind: mention.kind,
    href: mention.href || null,
  }
}

/**
 * Si el portapapeles trae una URL/ruta del CRM, inserta una mención con el nombre del registro.
 * Si había un `@` abierto antes del cursor, reemplaza desde ahí.
 */
export function handleMentionUrlPaste(
  editor: Editor,
  event: ClipboardEvent,
): boolean {
  const text = event.clipboardData?.getData('text/plain')?.trim()
  if (!text) return false

  const mention = resolveMentionFromUrl(text)
  if (!mention) return false

  const { state } = editor
  const { $from } = state.selection
  const parent = $from.parent
  if (!parent.isTextblock) return false

  const textBefore = parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
  const atIndex = textBefore.lastIndexOf('@')
  const attrs = mentionInsertAttrs(mention)
  const content = [{ type: 'mention', attrs }, { type: 'text', text: ' ' }]

  if (atIndex >= 0) {
    const from = $from.start() + atIndex
    editor
      .chain()
      .focus()
      .deleteRange({ from, to: $from.pos })
      .insertContent(content)
      .run()
  } else {
    editor.chain().focus().insertContent(content).run()
  }

  return true
}
