import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { SolicitudInlineImage } from '@/components/solicitudes/solicitud-inline-image-extension'
import { Button } from '@/components/ui/button'
import type { SolicitudFile } from '@/lib/solicitud-files'
import { hydrateDescriptionHtml } from '@/lib/solicitud-description-media'
import {
  solicitudFileFromUpload,
  validateSolicitudFilesForUpload,
} from '@/lib/solicitud-files'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import '@/components/shared/rich-text/rich-text.css'

type SolicitudDescriptionEditorProps = {
  /** HTML inicial (se hidrata con initialFiles al montar). */
  initialHtml: string
  initialFiles: SolicitudFile[]
  authorName: string
  onChange: (html: string) => void
  onFilesChange: (files: SolicitudFile[]) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  imagesHint?: string
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

export function SolicitudDescriptionEditor({
  initialHtml,
  initialFiles,
  authorName,
  onChange,
  onFilesChange,
  disabled = false,
  className,
  placeholder = 'Describe la solicitud. Combina texto e imágenes; las imágenes se guardan en Archivos.',
  imagesHint = 'Imágenes → Archivos',
}: SolicitudDescriptionEditorProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const filesRef = useRef(initialFiles)
  const editorRef = useRef<Editor | null>(null)
  filesRef.current = initialFiles

  const insertImageFile = useCallback(
    async (file: File, ed: Editor) => {
      const validation = validateSolicitudFilesForUpload(filesRef.current, [file])
      if (validation) {
        toast.warning(validation)
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.warning('Solo puedes insertar imágenes en la descripción.')
        return
      }

      setUploading(true)
      try {
        const uploaded = await solicitudFileFromUpload(file, authorName)
        const nextFiles = [uploaded, ...filesRef.current]
        filesRef.current = nextFiles
        onFilesChange(nextFiles)

        ed
          .chain()
          .focus()
          .insertContent({
            type: 'solicitudInlineImage',
            attrs: {
              src: uploaded.dataUrl,
              alt: uploaded.name,
              fileId: uploaded.id,
            },
          })
          .run()
      } catch {
        toast.error('No se pudo cargar la imagen.')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [authorName, onFilesChange],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      SolicitudInlineImage,
    ],
    content: hydrateDescriptionHtml(initialHtml, initialFiles),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const ed = editorRef.current
        if (disabled || !ed) return false
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              event.preventDefault()
              void insertImageFile(file, ed)
              return true
            }
          }
        }
        return false
      },
      handleDrop: (_view, event) => {
        const ed = editorRef.current
        if (disabled || !ed) return false
        const file = Array.from(event.dataTransfer?.files ?? []).find((f) =>
          f.type.startsWith('image/'),
        )
        if (!file) return false
        event.preventDefault()
        void insertImageFile(file, ed)
        return true
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled && !uploading)
  }, [editor, disabled, uploading])

  const pickImages = () => {
    if (!disabled && !uploading) inputRef.current?.click()
  }

  if (!editor) return null

  return (
    <div
      className={cn(
        'rich-text-editor overflow-hidden rounded-lg border border-border bg-background shadow-sm',
        (disabled || uploading) && 'opacity-60',
        className,
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const list = e.target.files
          if (!list?.length || !editor) return
          void (async () => {
            for (const file of Array.from(list)) {
              await insertImageFile(file, editor)
            }
          })()
        }}
      />

      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
        <ToolbarButton
          label="Negrita"
          disabled={disabled || uploading}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          disabled={disabled || uploading}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          disabled={disabled || uploading}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon aria-hidden className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Texto normal"
          disabled={disabled || uploading}
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título mediano"
          disabled={disabled || uploading}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título grande"
          disabled={disabled || uploading}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 aria-hidden className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Lista con viñetas"
          disabled={disabled || uploading}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          disabled={disabled || uploading}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Insertar imagen"
          disabled={disabled || uploading}
          onClick={pickImages}
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <ImagePlus aria-hidden className="size-4" />
          )}
        </ToolbarButton>
        <span className="ms-auto hidden pe-2 text-xs text-muted-foreground sm:inline">
          {imagesHint}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
