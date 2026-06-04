import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  createReportApi,
  createReportFolderApi,
  deleteReportApi,
  deleteReportFolderApi,
  getReportsTreeApi,
  recordReportRunApi,
  updateReportApi,
  updateReportFolderApi,
  updateReportTableConfigApi,
} from '@/api/reports'
import {
  ReportsTreeContext,
  type ReportFolderInput,
  type ReportItemInput,
} from '@/contexts/reports-tree-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { createReportsTreeSeed } from '@/data/reports-tree.mock'
import {
  collectFolderIds,
  createId,
  findFolder,
  findReport,
  folderHasChildren,
  validateNodeName,
} from '@/lib/reports-tree'
import { createDefaultReportTableConfig } from '@/types/report-table'
import type { ReportTableConfig } from '@/types/report-table'
import type {
  ReportFolder,
  ReportItem,
  ReportsSelection,
  ReportsTreeData,
} from '@/types/reports-tree'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { toast } from '@/lib/toast'

const useApi = isApiEnabled()
const TREE_KEY = `${STORAGE_PREFIX}-crm-reports-tree`
const EXPANDED_KEY = `${STORAGE_PREFIX}-crm-reports-expanded`

function loadTreeLocal(): ReportsTreeData {
  try {
    const raw = localStorage.getItem(TREE_KEY)
    if (!raw) return createReportsTreeSeed()
    const parsed = JSON.parse(raw) as ReportsTreeData
    if (!parsed.folders?.length) return createReportsTreeSeed()
    return parsed
  } catch {
    return createReportsTreeSeed()
  }
}

function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY)
    if (!raw) {
      const seed = createReportsTreeSeed()
      return new Set(seed.folders.filter((f) => f.parentId === null).map((f) => f.id))
    }
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function persistTreeLocal(tree: ReportsTreeData) {
  try {
    localStorage.setItem(TREE_KEY, JSON.stringify(tree))
  } catch {
    /* ignore */
  }
}

function persistExpanded(ids: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function ReportsRegistryProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<ReportsTreeData>(() =>
    useApi ? { folders: [], reports: [] } : loadTreeLocal(),
  )
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => loadExpanded())
  const [selection, setSelection] = useState<ReportsSelection | null>(null)
  const [query, setQuery] = useState('')

  const reloadFromApi = useCallback(async () => {
    const data = await getReportsTreeApi()
    setTree(data)
    setSelection((prev) => {
      if (prev) {
        if (prev.kind === 'folder' && data.folders.some((f) => f.id === prev.id)) return prev
        if (prev.kind === 'report' && data.reports.some((r) => r.id === prev.id)) return prev
      }
      const root = data.folders.find((f) => f.parentId === null)
      return root ? { kind: 'folder', id: root.id } : null
    })
  }, [])

  useEffect(() => {
    if (useApi) return
    setSelection((prev) => {
      if (prev) return prev
      const roots = loadTreeLocal().folders.filter((f) => f.parentId === null)
      return roots[0] ? { kind: 'folder', id: roots[0].id } : null
    })
  }, [useApi])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'reportes', enabled: false })

  const saveTree = useCallback(
    (next: ReportsTreeData) => {
      setTree(next)
      if (!useApi) persistTreeLocal(next)
    },
    [],
  )

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      persistExpanded(next)
      return next
    })
  }, [])

  const expandFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      next.add(folderId)
      persistExpanded(next)
      return next
    })
  }, [])

  const expandAllFolders = useCallback(
    (folderIds?: string[]) => {
      const ids = folderIds ?? collectFolderIds(tree)
      const next = new Set(ids)
      setExpandedFolderIds(next)
      persistExpanded(next)
    },
    [tree],
  )

  const collapseAllFolders = useCallback(() => {
    const next = new Set<string>()
    setExpandedFolderIds(next)
    persistExpanded(next)
  }, [])

  const selectFolder = useCallback(
    (folderId: string) => {
      setSelection({ kind: 'folder', id: folderId })
      expandFolder(folderId)
    },
    [expandFolder],
  )

  const selectReport = useCallback((reportId: string) => {
    setSelection({ kind: 'report', id: reportId })
  }, [])

  const clearSelection = useCallback(() => setSelection(null), [])

  const createFolder = useCallback(
    async (input: ReportFolderInput): Promise<ReportFolder | null> => {
      const err = validateNodeName(input.name)
      if (err) return null
      if (input.parentId && !findFolder(tree, input.parentId)) return null

      if (useApi) {
        try {
          const folder = await createReportFolderApi(input)
          saveTree({ ...tree, folders: [...tree.folders, folder] })
          if (input.parentId) expandFolder(input.parentId)
          selectFolder(folder.id)
          return folder
        } catch {
          toast.error('No se pudo crear la carpeta.')
          return null
        }
      }

      const folder: ReportFolder = {
        id: createId('fld'),
        name: input.name.trim(),
        parentId: input.parentId,
      }
      saveTree({ ...tree, folders: [...tree.folders, folder] })
      if (input.parentId) expandFolder(input.parentId)
      selectFolder(folder.id)
      return folder
    },
    [expandFolder, saveTree, selectFolder, tree],
  )

  const updateFolder = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const err = validateNodeName(name)
      if (err) return false
      if (!findFolder(tree, id)) return false

      if (useApi) {
        try {
          const folder = await updateReportFolderApi(id, name)
          saveTree({
            ...tree,
            folders: tree.folders.map((f) => (f.id === id ? folder : f)),
          })
          return true
        } catch {
          toast.error('No se pudo actualizar la carpeta.')
          return false
        }
      }

      saveTree({
        ...tree,
        folders: tree.folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)),
      })
      return true
    },
    [saveTree, tree],
  )

  const deleteFolder = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!findFolder(tree, id)) return { ok: false, error: 'Carpeta no encontrada.' }
      if (folderHasChildren(tree, id)) {
        return {
          ok: false,
          error: 'La carpeta no está vacía. Elimina o mueve su contenido primero.',
        }
      }

      if (useApi) {
        const result = await deleteReportFolderApi(id)
        if (!result.ok) return result
        const nextFolders = tree.folders.filter((f) => f.id !== id)
        saveTree({ ...tree, folders: nextFolders })
        setExpandedFolderIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          persistExpanded(next)
          return next
        })
        if (selection?.kind === 'folder' && selection.id === id) {
          const fallback = nextFolders.find((f) => f.parentId === null)
          setSelection(fallback ? { kind: 'folder', id: fallback.id } : null)
        }
        return { ok: true }
      }

      const nextFolders = tree.folders.filter((f) => f.id !== id)
      saveTree({ ...tree, folders: nextFolders })
      setExpandedFolderIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        persistExpanded(next)
        return next
      })
      if (selection?.kind === 'folder' && selection.id === id) {
        const fallback = nextFolders.find((f) => f.parentId === null)
        setSelection(fallback ? { kind: 'folder', id: fallback.id } : null)
      }
      return { ok: true }
    },
    [saveTree, selection, tree],
  )

  const createReport = useCallback(
    async (input: ReportItemInput): Promise<ReportItem | null> => {
      const err = validateNodeName(input.name)
      if (err) return null
      if (!findFolder(tree, input.folderId)) return null

      if (useApi) {
        try {
          const report = await createReportApi({
            ...input,
            templateId: 'tabla-dinamica',
            schedule: 'Manual',
            reportType: input.reportType.trim() || 'Tabla dinámica',
            tableConfig: input.tableConfig ?? createDefaultReportTableConfig(),
          })
          saveTree({ ...tree, reports: [...tree.reports, report] })
          expandFolder(input.folderId)
          selectReport(report.id)
          return report
        } catch {
          toast.error('No se pudo crear el reporte.')
          return null
        }
      }

      const templateId = 'tabla-dinamica'
      const report: ReportItem = {
        id: createId('rpt'),
        name: input.name.trim(),
        folderId: input.folderId,
        reportType: input.reportType.trim() || 'Tabla dinámica',
        author: input.author.trim(),
        lastRun: 'Sin ejecutar',
        schedule: 'Manual',
        description: input.description.trim(),
        updatedAt: 'Recién creado',
        templateId,
        tableConfig:
          templateId === 'tabla-dinamica'
            ? (input.tableConfig ?? createDefaultReportTableConfig())
            : undefined,
      }
      saveTree({ ...tree, reports: [...tree.reports, report] })
      expandFolder(input.folderId)
      selectReport(report.id)
      return report
    },
    [expandFolder, saveTree, selectReport, tree],
  )

  const updateReport = useCallback(
    async (id: string, input: ReportItemInput): Promise<boolean> => {
      const err = validateNodeName(input.name)
      if (err) return false
      if (!findReport(tree, id)) return false
      if (!findFolder(tree, input.folderId)) return false

      if (useApi) {
        try {
          const { lastRun: _lastRun, ...payload } = input
          const report = await updateReportApi(id, {
            ...payload,
            templateId: 'tabla-dinamica',
            schedule: 'Manual',
          })
          saveTree({
            ...tree,
            reports: tree.reports.map((r) => (r.id === id ? report : r)),
          })
          return true
        } catch {
          toast.error('No se pudo actualizar el reporte.')
          return false
        }
      }

      saveTree({
        ...tree,
        reports: tree.reports.map((r) =>
          r.id === id
            ? {
                ...r,
                name: input.name.trim(),
                folderId: input.folderId,
                reportType: input.reportType.trim() || 'Tabla dinámica',
                author: input.author.trim(),
                schedule: 'Manual',
                description: input.description.trim(),
                updatedAt: 'Actualizado',
                templateId: 'tabla-dinamica',
                tableConfig:
                  input.tableConfig ?? r.tableConfig ?? createDefaultReportTableConfig(),
              }
            : r,
        ),
      })
      return true
    },
    [saveTree, tree],
  )

  const updateReportTableConfig = useCallback(
    async (reportId: string, tableConfig: ReportTableConfig) => {
      if (!findReport(tree, reportId)) return

      if (useApi) {
        try {
          const report = await updateReportTableConfigApi(reportId, tableConfig)
          saveTree({
            ...tree,
            reports: tree.reports.map((r) => (r.id === reportId ? report : r)),
          })
        } catch {
          toast.error('No se pudo guardar la configuración del reporte.')
        }
        return
      }

      saveTree({
        ...tree,
        reports: tree.reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                templateId: 'tabla-dinamica',
                tableConfig,
                updatedAt: 'Configuración guardada',
              }
            : r,
        ),
      })
    },
    [saveTree, tree],
  )

  const deleteReport = useCallback(
    async (id: string): Promise<boolean> => {
      if (!findReport(tree, id)) return false

      if (useApi) {
        try {
          await deleteReportApi(id)
          saveTree({ ...tree, reports: tree.reports.filter((r) => r.id !== id) })
          if (selection?.kind === 'report' && selection.id === id) {
            const report = findReport(tree, id)
            const folderId = report?.folderId
            setSelection(folderId ? { kind: 'folder', id: folderId } : null)
          }
          return true
        } catch {
          toast.error('No se pudo eliminar el reporte.')
          return false
        }
      }

      saveTree({ ...tree, reports: tree.reports.filter((r) => r.id !== id) })
      if (selection?.kind === 'report' && selection.id === id) {
        const report = findReport(tree, id)
        const folderId = report?.folderId
        setSelection(folderId ? { kind: 'folder', id: folderId } : null)
      }
      return true
    },
    [saveTree, selection, tree],
  )

  const getSelectedFolder = useCallback(() => {
    if (selection?.kind !== 'folder') return undefined
    return findFolder(tree, selection.id)
  }, [selection, tree])

  const getSelectedReport = useCallback(() => {
    if (selection?.kind !== 'report') return undefined
    return findReport(tree, selection.id)
  }, [selection, tree])

  const recordReportRun = useCallback(
    async (reportId: string, lastRun: string) => {
      if (!findReport(tree, reportId)) return

      if (useApi) {
        try {
          const { report } = await recordReportRunApi(reportId)
          saveTree({
            ...tree,
            reports: tree.reports.map((r) =>
              r.id === reportId
                ? { ...r, lastRun: report.lastRun, updatedAt: report.updatedAt }
                : r,
            ),
          })
        } catch {
          console.error('No se pudo registrar la ejecución del reporte.')
        }
        return
      }

      saveTree({
        ...tree,
        reports: tree.reports.map((r) =>
          r.id === reportId ? { ...r, lastRun, updatedAt: 'Ejecutado' } : r,
        ),
      })
    },
    [saveTree, tree],
  )

  const value = useMemo(
    () => ({
      tree,
      expandedFolderIds,
      selection,
      query,
      setQuery,
      toggleFolder,
      expandFolder,
      expandAllFolders,
      collapseAllFolders,
      selectFolder,
      selectReport,
      clearSelection,
      createFolder,
      updateFolder,
      deleteFolder,
      createReport,
      updateReport,
      deleteReport,
      getSelectedFolder,
      getSelectedReport,
      recordReportRun,
      updateReportTableConfig,
      reloadFromApi,
    }),
    [
      tree,
      expandedFolderIds,
      selection,
      query,
      toggleFolder,
      expandFolder,
      expandAllFolders,
      collapseAllFolders,
      selectFolder,
      selectReport,
      clearSelection,
      createFolder,
      updateFolder,
      deleteFolder,
      createReport,
      updateReport,
      deleteReport,
      getSelectedFolder,
      getSelectedReport,
      recordReportRun,
      updateReportTableConfig,
      reloadFromApi,
    ],
  )

  return (
    <ReportsTreeContext.Provider value={value}>{children}</ReportsTreeContext.Provider>
  )
}
