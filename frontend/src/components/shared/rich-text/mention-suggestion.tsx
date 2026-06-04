import { ReactRenderer } from '@tiptap/react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'

import { MentionList, type MentionListRef } from '@/components/shared/rich-text/MentionList'
import { filterMentionItemsAsync } from '@/lib/mentions'

export const mentionSuggestionOptions: Omit<
  SuggestionOptions,
  'editor'
> = {
  char: '@',
  allowSpaces: false,
  items: ({ query }) => filterMentionItemsAsync(query, 12),

  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null
    let popup: TippyInstance | null = null

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) return

        popup = tippy(document.createElement('div'), {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate: (props) => {
        component?.updateProps(props)
        if (!props.clientRect || !popup) return
        popup.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        })
      },

      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          popup?.hide()
          return true
        }
        return component?.ref?.onKeyDown(props) ?? false
      },

      onExit: () => {
        popup?.destroy()
        component?.destroy()
      },
    }
  },
}
