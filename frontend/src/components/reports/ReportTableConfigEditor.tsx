import { useEffect } from 'react'

import { ContactFormSelect } from '@/components/contacts/ContactFormField'
import { ReportFilterBuilder } from '@/components/reports/ReportFilterBuilder'
import { ReportSortableColumns } from '@/components/reports/ReportSortableColumns'
import {
  getDefaultColumnIds,
  getReportDataSourceFields,
  getReportJoinOptions,
} from '@/lib/report-data-sources'
import { sanitizeReportTableConfigColumns } from '@/lib/report-table-run'
import {
  REPORT_DATA_SOURCE_LABELS,
  type ReportDataSourceId,
  type ReportTableConfig,
} from '@/types/report-table'

const SOURCE_OPTIONS = (
  Object.entries(REPORT_DATA_SOURCE_LABELS) as [ReportDataSourceId, string][]
).map(([value, label]) => ({ value, label }))

type ReportTableConfigEditorProps = {
  config: ReportTableConfig
  onChange: (config: ReportTableConfig) => void
}

export function ReportTableConfigEditor({
  config,
  onChange,
}: ReportTableConfigEditorProps) {
  const joinOptions = getReportJoinOptions(config.dataSource)
  const joinId = config.joinId ?? ''
  const fields = getReportDataSourceFields(config.dataSource, config.joinId)

  useEffect(() => {
    const sanitized = sanitizeReportTableConfigColumns(config)
    if (sanitized !== config) onChange(sanitized)
  }, [config, fields, onChange])

  const patch = (partial: Partial<ReportTableConfig>) => {
    onChange({ ...config, ...partial })
  }

  const toggleColumn = (fieldId: string) => {
    const next = config.columnIds.includes(fieldId)
      ? config.columnIds.filter((id) => id !== fieldId)
      : [...config.columnIds, fieldId]
    patch({ columnIds: next })
  }

  const selectAllColumns = () => {
    patch({ columnIds: getDefaultColumnIds(config.dataSource, config.joinId) })
  }

  const clearAllColumns = () => {
    patch({ columnIds: [] })
  }

  const changeSource = (dataSource: ReportDataSourceId) => {
    onChange({
      dataSource,
      joinId: undefined,
      columnIds: getDefaultColumnIds(dataSource, undefined),
      conditions: [],
      combineMode: 'all-and',
      customExpression: '',
    })
  }

  const changeJoin = (nextJoinId: string) => {
    onChange({
      ...config,
      joinId: nextJoinId.trim() ? nextJoinId : undefined,
      columnIds: getDefaultColumnIds(
        config.dataSource,
        nextJoinId.trim() ? nextJoinId : undefined,
      ),
      conditions: [],
      combineMode: 'all-and',
      customExpression: '',
    })
  }

  return (
    <div className="space-y-5">
      <ContactFormSelect
        id="rpt-source"
        label="Fuente de datos"
        value={config.dataSource}
        onChange={(v) => changeSource(v as ReportDataSourceId)}
        options={SOURCE_OPTIONS}
      />

      {joinOptions.length > 0 ? (
        <ContactFormSelect
          id="rpt-join"
          label="Relacionar con (máx. 1)"
          value={joinId}
          onChange={(v) => changeJoin(v)}
          options={[
            { value: '', label: 'Sin relación' },
            ...joinOptions.map((j) => ({ value: j.id, label: j.label })),
          ]}
        />
      ) : null}

      <ReportSortableColumns
        columnIds={config.columnIds}
        fields={fields}
        onChange={(columnIds) => patch({ columnIds })}
        onToggleField={toggleColumn}
        onSelectAll={selectAllColumns}
        onClearAll={clearAllColumns}
      />

      <ReportFilterBuilder
        dataSource={config.dataSource}
        joinId={config.joinId}
        conditions={config.conditions}
        combineMode={config.combineMode}
        customExpression={config.customExpression}
        onChange={(p) => patch(p)}
      />
    </div>
  )
}
