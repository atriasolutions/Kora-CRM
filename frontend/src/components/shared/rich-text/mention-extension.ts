import Mention from '@tiptap/extension-mention'
import { mergeAttributes } from '@tiptap/core'

import type { MentionKind } from '@/lib/mentions'

export const EntityMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mentionKind: {
        default: 'user' as MentionKind,
        parseHTML: (element) =>
          (element.getAttribute('data-mention-kind') as MentionKind) ?? 'user',
        renderHTML: (attributes) => ({
          'data-mention-kind': attributes.mentionKind,
        }),
      },
      href: {
        default: null as string | null,
        parseHTML: (element) => element.getAttribute('data-href'),
        renderHTML: (attributes) => {
          if (!attributes.href) return {}
          return { 'data-href': attributes.href }
        },
      },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = (node.attrs.mentionKind as MentionKind) ?? 'user'
    const label = node.attrs.label ?? node.attrs.id
    const display = kind === 'user' ? `@${label}` : label

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mention',
        'data-id': node.attrs.id,
        'data-label': label,
        class:
          kind === 'user'
            ? 'mention mention-user'
            : 'mention mention-record',
      }),
      display,
    ]
  },
})
