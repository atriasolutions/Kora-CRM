import { Link } from 'react-router-dom'

import { MENTION_KIND_LABELS, type NoteMention } from '@/lib/mentions'

function MentionChip({ mention }: { mention: NoteMention }) {
  const kindLabel = MENTION_KIND_LABELS[mention.kind]
  const content = (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{kindLabel}:</span>
      <span className="font-medium">
        {mention.kind === 'user' ? `@${mention.label}` : mention.label}
      </span>
    </span>
  )

  if (mention.href) {
    return (
      <Link to={mention.href} className="hover:opacity-80">
        {content}
      </Link>
    )
  }

  return content
}

type MentionChipsListProps = {
  mentions: NoteMention[]
  className?: string
}

export function MentionChipsList({ mentions, className }: MentionChipsListProps) {
  if (mentions.length === 0) return null

  return (
    <div className={className ?? 'mt-2 flex flex-wrap gap-1.5'}>
      {mentions.map((mention) => (
        <MentionChip key={mention.id} mention={mention} />
      ))}
    </div>
  )
}
