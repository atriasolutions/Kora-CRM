import type {
  ReportFolder,
  ReportItem,
  ReportsSelection,
  ReportsTreeData,
} from '@/types/reports-tree'

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function collectFolderIds(tree: ReportsTreeData): string[] {
  return tree.folders.map((f) => f.id)
}

export function getRootFolders(tree: ReportsTreeData): ReportFolder[] {
  return tree.folders
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function getChildFolders(tree: ReportsTreeData, folderId: string): ReportFolder[] {
  return tree.folders
    .filter((f) => f.parentId === folderId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function getFolderReports(tree: ReportsTreeData, folderId: string): ReportItem[] {
  return tree.reports
    .filter((r) => r.folderId === folderId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function findFolder(tree: ReportsTreeData, id: string): ReportFolder | undefined {
  return tree.folders.find((f) => f.id === id)
}

export function findReport(tree: ReportsTreeData, id: string): ReportItem | undefined {
  return tree.reports.find((r) => r.id === id)
}

export function folderHasChildren(tree: ReportsTreeData, folderId: string): boolean {
  return (
    tree.folders.some((f) => f.parentId === folderId) ||
    tree.reports.some((r) => r.folderId === folderId)
  )
}

export function getFolderPath(tree: ReportsTreeData, folderId: string): ReportFolder[] {
  const path: ReportFolder[] = []
  let current = findFolder(tree, folderId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? findFolder(tree, current.parentId) : undefined
  }
  return path
}

export function isDescendantFolder(
  tree: ReportsTreeData,
  ancestorId: string,
  possibleDescendantId: string,
): boolean {
  let current = findFolder(tree, possibleDescendantId)
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    current = findFolder(tree, current.parentId)
  }
  return false
}

export function selectionMatches(
  selection: ReportsSelection | null,
  kind: ReportsSelection['kind'],
  id: string,
): boolean {
  return selection?.kind === kind && selection.id === id
}

export function filterTreeByQuery(tree: ReportsTreeData, query: string): ReportsTreeData {
  const q = query.trim().toLowerCase()
  if (!q) return tree

  const matchingReportIds = new Set(
    tree.reports
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.reportType.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q),
      )
      .map((r) => r.id),
  )

  const matchingFolderIds = new Set(
    tree.folders.filter((f) => f.name.toLowerCase().includes(q)).map((f) => f.id),
  )

  const includeFolderIds = new Set<string>()
  for (const folder of tree.folders) {
    if (matchingFolderIds.has(folder.id)) {
      includeFolderIds.add(folder.id)
      let parent = folder.parentId ? findFolder(tree, folder.parentId) : undefined
      while (parent) {
        includeFolderIds.add(parent.id)
        parent = parent.parentId ? findFolder(tree, parent.parentId) : undefined
      }
    }
  }

  for (const report of tree.reports) {
    if (matchingReportIds.has(report.id)) {
      includeFolderIds.add(report.folderId)
      let folder = findFolder(tree, report.folderId)
      while (folder?.parentId) {
        includeFolderIds.add(folder.parentId)
        folder = findFolder(tree, folder.parentId)
      }
    }
  }

  return {
    folders: tree.folders.filter((f) => includeFolderIds.has(f.id)),
    reports: tree.reports.filter(
      (r) => matchingReportIds.has(r.id) || includeFolderIds.has(r.folderId),
    ),
  }
}

export function validateNodeName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'El nombre es obligatorio.'
  if (trimmed.length > 80) return 'El nombre no puede superar 80 caracteres.'
  return null
}
