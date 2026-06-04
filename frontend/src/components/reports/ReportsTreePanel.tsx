import { useMemo } from 'react'

import { ReportsTreeRow } from '@/components/reports/ReportsTreeRow'
import { useReportsTree } from '@/hooks/use-reports-tree'
import {
  filterTreeByQuery,
  getChildFolders,
  getFolderReports,
  getRootFolders,
} from '@/lib/reports-tree'
import type { ReportFolder } from '@/types/reports-tree'

function FolderBranch({
  folder,
  depth,
}: {
  folder: ReportFolder
  depth: number
}) {
  const {
    tree,
    query,
    expandedFolderIds,
    selection,
    toggleFolder,
    selectFolder,
    selectReport,
  } = useReportsTree()

  const filtered = useMemo(() => filterTreeByQuery(tree, query), [tree, query])
  const childFolders = getChildFolders(filtered, folder.id)
  const reports = getFolderReports(filtered, folder.id)
  const expanded = expandedFolderIds.has(folder.id)

  return (
    <li className="min-w-0">
      <ReportsTreeRow
        depth={depth}
        folder={folder}
        selection={selection}
        expandedFolderIds={expandedFolderIds}
        hasChildFolders={childFolders.length > 0}
        hasReports={reports.length > 0}
        onToggleFolder={toggleFolder}
        onSelectFolder={selectFolder}
        onSelectReport={selectReport}
      />
      {expanded ? (
        <ul className="min-w-0">
          {childFolders.map((child) => (
            <FolderBranch key={child.id} folder={child} depth={depth + 1} />
          ))}
          {reports.map((report) => (
            <li key={report.id}>
              <ReportsTreeRow
                depth={depth + 1}
                report={report}
                selection={selection}
                expandedFolderIds={expandedFolderIds}
                onToggleFolder={toggleFolder}
                onSelectFolder={selectFolder}
                onSelectReport={selectReport}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function ReportsTreePanel() {
  const { tree, query } = useReportsTree()
  const filtered = useMemo(() => filterTreeByQuery(tree, query), [tree, query])
  const roots = getRootFolders(filtered)

  if (roots.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        {query.trim() ? 'Sin resultados para la búsqueda.' : 'No hay carpetas.'}
      </p>
    )
  }

  return (
    <ul className="min-w-0 space-y-0.5 p-2" role="tree" aria-label="Carpetas de reportes">
      {roots.map((folder) => (
        <FolderBranch key={folder.id} folder={folder} depth={0} />
      ))}
    </ul>
  )
}
