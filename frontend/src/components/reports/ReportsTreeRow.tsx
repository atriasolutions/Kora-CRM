import { ChevronRight, FileBarChart, Folder, FolderOpen } from 'lucide-react'

import type { ReportFolder, ReportItem } from '@/types/reports-tree'
import { selectionMatches } from '@/lib/reports-tree'
import type { ReportsSelection } from '@/types/reports-tree'
import { cn } from '@/lib/utils'

type ReportsTreeRowProps = {
  depth: number
  selection: ReportsSelection | null
  expandedFolderIds: Set<string>
  onToggleFolder: (id: string) => void
  onSelectFolder: (id: string) => void
  onSelectReport: (id: string) => void
  folder?: ReportFolder
  report?: ReportItem
  hasChildFolders?: boolean
  hasReports?: boolean
}

export function ReportsTreeRow({
  depth,
  selection,
  expandedFolderIds,
  onToggleFolder,
  onSelectFolder,
  onSelectReport,
  folder,
  report,
  hasChildFolders = false,
  hasReports = false,
}: ReportsTreeRowProps) {
  const pad = 8 + depth * 14

  if (folder) {
    const expanded = expandedFolderIds.has(folder.id)
    const selected = selectionMatches(selection, 'folder', folder.id)
    const hasChildren = hasChildFolders || hasReports

    return (
      <div
        className={cn(
          'group flex w-full min-w-0 items-center gap-0.5 rounded-md py-1 pe-2 text-sm transition-colors',
          selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
        )}
        style={{ paddingInlineStart: pad }}
      >
        <button
          type="button"
          aria-label={expanded ? 'Contraer carpeta' : 'Expandir carpeta'}
          disabled={!hasChildren}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggleFolder(folder.id)
          }}
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-sm',
            hasChildren ? 'hover:bg-muted' : 'opacity-30',
          )}
        >
          <ChevronRight
            aria-hidden
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              expanded && hasChildren && 'rotate-90',
            )}
          />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-start"
          onClick={() => onSelectFolder(folder.id)}
        >
          {expanded ? (
            <FolderOpen aria-hidden className="size-4 shrink-0 text-amber-500" />
          ) : (
            <Folder aria-hidden className="size-4 shrink-0 text-amber-500" />
          )}
          <span className="truncate font-medium">{folder.name}</span>
        </button>
      </div>
    )
  }

  if (report) {
    const selected = selectionMatches(selection, 'report', report.id)
    return (
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pe-2 text-start text-sm transition-colors',
          selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
        )}
        style={{ paddingInlineStart: pad + 24 }}
        onClick={() => onSelectReport(report.id)}
      >
        <FileBarChart aria-hidden className="size-4 shrink-0 opacity-70" />
        <span className="truncate">{report.name}</span>
      </button>
    )
  }

  return null
}
