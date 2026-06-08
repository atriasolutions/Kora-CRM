import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'span',
  'img',
]

const ALLOWED_ATTR = [
  'class',
  'data-type',
  'data-id',
  'data-label',
  'data-mention-kind',
  'data-href',
  'data-file-id',
  'alt',
  'src',
  'role',
  'tabindex',
  'style',
]

export function sanitizeRichTextHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}
