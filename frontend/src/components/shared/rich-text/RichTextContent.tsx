import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { sanitizeRichTextHtml } from '@/lib/rich-text-sanitize'
import { cn } from '@/lib/utils'

import '@/components/shared/rich-text/rich-text.css'

type RichTextContentProps = {
  html: string
  className?: string
}

function normalizeNoteHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ''
  if (trimmed.includes('<')) return trimmed
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped}</p>`
}

export function RichTextContent({ html, className }: RichTextContentProps) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const safe = sanitizeRichTextHtml(normalizeNoteHtml(html))

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const links = root.querySelectorAll<HTMLElement>('[data-href]')
    const cleanups: Array<() => void> = []

    links.forEach((node) => {
      const href = node.getAttribute('data-href')
      if (!href) return

      node.setAttribute('role', 'link')
      node.setAttribute('tabindex', '0')
      node.classList.add('mention-link')

      const open = (event: Event) => {
        event.preventDefault()
        navigate(href)
      }

      node.addEventListener('click', open)
      node.addEventListener('keydown', (event) => {
        if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')) {
          open(event)
        }
      })

      cleanups.push(() => {
        node.removeEventListener('click', open)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [navigate, safe])

  if (!safe.trim()) return null

  return (
    <div
      ref={ref}
      className={cn('rich-text-content', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
