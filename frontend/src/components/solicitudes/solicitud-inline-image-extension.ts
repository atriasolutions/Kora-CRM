import { Node, mergeAttributes } from '@tiptap/core'

import {
  SOLICITUD_FILE_ID_ATTR,
  SOLICITUD_INLINE_IMAGE_CLASS,
} from '@/lib/solicitud-description-media'

export const SolicitudInlineImage = Node.create({
  name: 'solicitudInlineImage',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) return {}
          return { src: attributes.src }
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) return {}
          return { alt: attributes.alt }
        },
      },
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute(SOLICITUD_FILE_ID_ATTR),
        renderHTML: (attributes) => {
          const id = attributes.fileId
          if (!id) return {}
          return { [SOLICITUD_FILE_ID_ATTR]: id }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: `img[${SOLICITUD_FILE_ID_ATTR}]` }, { tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        class: SOLICITUD_INLINE_IMAGE_CLASS,
      }),
    ]
  },
})
