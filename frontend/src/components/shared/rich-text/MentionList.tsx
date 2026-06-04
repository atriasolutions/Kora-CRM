import {
  Building2,
  Contact,
  FileText,
  FolderKanban,
  Package,
  Receipt,
  Target,
  User,
  Zap,
} from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'

import {
  groupMentionItems,
  MENTION_KIND_LABELS,
  type MentionItem,
  type MentionKind,
} from '@/lib/mentions'
import { cn } from '@/lib/utils'

export type MentionListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

type MentionListProps = {
  items: MentionItem[]
  command: (item: {
    id: string
    label: string
    mentionKind: MentionKind
    href: string | null
  }) => void
}

function KindIcon({ kind }: { kind: MentionKind }) {
  const className = 'size-3.5 shrink-0 text-muted-foreground'
  switch (kind) {
    case 'user':
      return <User aria-hidden className={className} />
    case 'contact':
      return <Contact aria-hidden className={className} />
    case 'company':
      return <Building2 aria-hidden className={className} />
    case 'opportunity':
      return <Target aria-hidden className={className} />
    case 'quote':
      return <FileText aria-hidden className={className} />
    case 'project':
      return <FolderKanban aria-hidden className={className} />
    case 'product':
      return <Package aria-hidden className={className} />
    case 'invoice':
      return <Receipt aria-hidden className={className} />
    case 'activity':
      return <Zap aria-hidden className={className} />
    default:
      return <User aria-hidden className={className} />
  }
}

function itemInitials(label: string, kind: MentionKind): string {
  if (kind === 'user' || kind === 'contact') {
    return label
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }
  return label.slice(0, 2).toUpperCase()
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const groups = useMemo(() => groupMentionItems(items), [items])
    const orderedItems = useMemo(
      () => [...groups.values()].flat(),
      [groups],
    )

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = (item: MentionItem | undefined) => {
      if (item) {
        command({
          id: item.id,
          label: item.label,
          mentionKind: item.kind,
          href: item.href || null,
        })
      }
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + orderedItems.length - 1) % orderedItems.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % orderedItems.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(orderedItems[selectedIndex])
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Sin resultados
        </div>
      )
    }

    let runningIndex = 0

    return (
      <div className="max-h-64 w-72 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
        {[...groups.entries()].map(([kind, groupItems]) => (
          <div key={kind}>
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {MENTION_KIND_LABELS[kind]}
            </p>
            {groupItems.map((item) => {
              const index = runningIndex
              runningIndex += 1
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-start text-sm',
                    index === selectedIndex
                      ? 'bg-primary/10 text-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                  onClick={() => selectItem(item)}
                >
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md text-xs font-medium',
                      kind === 'user' || kind === 'contact'
                        ? 'rounded-full bg-muted'
                        : 'bg-muted/80',
                    )}
                  >
                    {kind === 'user' || kind === 'contact' ? (
                      itemInitials(item.label, kind)
                    ) : (
                      <KindIcon kind={kind} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {kind === 'user' ? `@${item.label}` : item.label}
                    </span>
                    {item.subtitle ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  },
)

MentionList.displayName = 'MentionList'
