import { createContext } from 'react'

import type {
  ReportFolder,
  ReportItem,
  ReportsSelection,
  ReportsTreeData,
  ReportTemplateId,
} from '@/types/reports-tree'
import type { ReportTableConfig } from '@/types/report-table'

export type ReportFolderInput = {
  name: string
  parentId: string | null
}

export type ReportItemInput = {
  name: string
  folderId: string
  reportType: string
  author: string
  /** Solo lectura; lo actualiza el servidor al ejecutar el reporte. */
  lastRun?: string
  schedule: ReportItem['schedule']
  description: string
  templateId?: ReportTemplateId
  tableConfig?: ReportTableConfig
}

export type ReportsTreeContextValue = {
  tree: ReportsTreeData
  expandedFolderIds: Set<string>
  selection: ReportsSelection | null
  query: string
  setQuery: (query: string) => void
  toggleFolder: (folderId: string) => void
  expandFolder: (folderId: string) => void
  expandAllFolders: (folderIds?: string[]) => void
  collapseAllFolders: () => void
  selectFolder: (folderId: string) => void
  selectReport: (reportId: string) => void
  clearSelection: () => void
  createFolder: (input: ReportFolderInput) => Promise<ReportFolder | null>
  updateFolder: (id: string, name: string) => Promise<boolean>
  deleteFolder: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>
  createReport: (input: ReportItemInput) => Promise<ReportItem | null>
  updateReport: (id: string, input: ReportItemInput) => Promise<boolean>
  deleteReport: (id: string) => Promise<boolean>
  getSelectedFolder: () => ReportFolder | undefined
  getSelectedReport: () => ReportItem | undefined
  recordReportRun: (reportId: string, lastRun: string) => Promise<void>
  updateReportTableConfig: (reportId: string, tableConfig: ReportTableConfig) => Promise<void>
  reloadFromApi: () => Promise<void>
}

export const ReportsTreeContext = createContext<ReportsTreeContextValue | null>(null)
