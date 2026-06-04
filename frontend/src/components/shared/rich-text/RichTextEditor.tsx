import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'

import { EntityMention } from '@/components/shared/rich-text/mention-extension'
import { mentionSuggestionOptions } from '@/components/shared/rich-text/mention-suggestion'
import { handleMentionUrlPaste } from '@/components/shared/rich-text/mention-url-paste'
import type { MentionKind } from '@/lib/mentions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import '@/components/shared/rich-text/rich-text.css'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'size-8 shrink-0',
        active && 'bg-primary/15 text-primary hover:bg-primary/20',
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe una nota… @ para mencionar o pega la URL de un registro.',
  disabled = false,
  className,
}: RichTextEditorProps) {
  const pasteHandlerRef = useRef<(event: ClipboardEvent) => boolean>(() => false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      EntityMention.configure({
        suggestion: mentionSuggestionOptions,
        renderLabel: ({ node }) => {
          const kind = (node.attrs.mentionKind as MentionKind) ?? 'user'
          const label = node.attrs.label ?? node.attrs.id
          return kind === 'user' ? `@${label}` : label
        },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
      handlePaste: (_view, event) => {
        if (pasteHandlerRef.current(event)) {
          event.preventDefault()
          return true
        }
        return false
      },
    },
  })

  useEffect(() => {
    pasteHandlerRef.current = (event) => {
      if (!editor) return false
      return handleMentionUrlPaste(editor, event)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) return null

  return (
    <div
      className={cn(
        'rich-text-editor overflow-hidden rounded-lg border border-border bg-background shadow-sm',
        disabled && 'opacity-60',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
        <ToolbarButton
          label="Negrita"
          disabled={disabled}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          disabled={disabled}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          disabled={disabled}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon aria-hidden className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Texto normal"
          disabled={disabled}
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título mediano"
          disabled={disabled}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título grande"
          disabled={disabled}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 aria-hidden className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Lista con viñetas"
          disabled={disabled}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          disabled={disabled}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden className="size-4" />
        </ToolbarButton>
        <span className="ms-auto pe-2 text-xs text-muted-foreground">
          @ o URL de registro
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
