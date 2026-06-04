import { Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ReportLookupFilterField } from '@/components/reports/ReportLookupFilterField'
import { Button } from '@/components/ui/button'
import {
  getReportDataSourceFields,
} from '@/lib/report-data-sources'
import {
  operatorNeedsValue,
  validateCustomExpression,
} from '@/lib/report-filter-engine'
import {
  REPORT_FILTER_OPERATOR_LABELS,
  type ReportFilterCombineMode,
  type ReportFilterCondition,
  type ReportDataSourceId,
} from '@/types/report-table'
import { cn } from '@/lib/utils'

function conditionValueInput({
  condId,
  fieldType,
  label,
  value,
  options,
  onChange,
}: {
  condId: string
  fieldType: 'text' | 'number' | 'date' | 'picklist' | 'lookup' | 'boolean'
  label: string
  value: string
  options?: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  if (fieldType === 'number') {
    return (
      <ContactFormInput
        id={`${condId}-val`}
        label={label}
        type="number"
        value={value}
        onChange={onChange}
      />
    )
  }

  if (fieldType === 'date') {
    return (
      <ContactFormInput
        id={`${condId}-val`}
        label={label}
        type="date"
        value={value}
        onChange={onChange}
      />
    )
  }

  if (fieldType === 'boolean') {
    return (
      <ContactFormSelect
        id={`${condId}-val`}
        label={label}
        value={value}
        onChange={onChange}
        options={[
          { value: 'true', label: 'Sí' },
          { value: 'false', label: 'No' },
        ]}
      />
    )
  }

  if (fieldType === 'lookup') {
    return (
      <ReportLookupFilterField
        label={label}
        value={value}
        options={options ?? []}
        onChange={onChange}
      />
    )
  }

  if (fieldType === 'picklist') {
    return (
      <ContactFormSelect
        id={`${condId}-val`}
        label={label}
        value={value}
        onChange={onChange}
        options={options ?? []}
      />
    )
  }

  return (
    <ContactFormInput
      id={`${condId}-val`}
      label={label}
      value={value}
      onChange={onChange}
    />
  )
}

function createConditionId(): string {
  return `cond-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

type ReportFilterBuilderProps = {
  dataSource: ReportDataSourceId
  joinId?: string
  conditions: ReportFilterCondition[]
  combineMode: ReportFilterCombineMode
  customExpression: string
  onChange: (patch: {
    conditions?: ReportFilterCondition[]
    combineMode?: ReportFilterCombineMode
    customExpression?: string
  }) => void
}

const COMBINE_OPTIONS: { value: ReportFilterCombineMode; label: string; hint: string }[] =
  [
    {
      value: 'all-and',
      label: 'Todas (Y)',
      hint: 'La fila debe cumplir la condición 1 Y la 2 Y la 3…',
    },
    {
      value: 'any-or',
      label: 'Cualquiera (O)',
      hint: 'La fila cumple si satisface la condición 1 O la 2 O la 3…',
    },
    {
      value: 'custom',
      label: 'Personalizada',
      hint: 'Combina con Y, O y paréntesis. Ej: 1 Y 2 O ((3 Y 4) O 5)',
    },
  ]

export function ReportFilterBuilder({
  dataSource,
  joinId,
  conditions,
  combineMode,
  customExpression,
  onChange,
}: ReportFilterBuilderProps) {
  const fields = getReportDataSourceFields(dataSource, joinId)
  const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields])
  const fieldOptions = fields.map((f) => ({ value: f.id, label: f.label }))
  const operatorOptions = Object.entries(REPORT_FILTER_OPERATOR_LABELS).map(
    ([value, label]) => ({ value, label }),
  )

  const expressionError =
    combineMode === 'custom' && conditions.length > 0
      ? validateCustomExpression(customExpression, conditions.length)
      : null

  const addCondition = () => {
    const firstField = fields[0]?.id ?? 'name'
    onChange({
      conditions: [
        ...conditions,
        {
          id: createConditionId(),
          fieldId: firstField,
          operator: 'contains',
          value: '',
        },
      ],
    })
  }

  const updateCondition = (
    id: string,
    patch: Partial<ReportFilterCondition>,
  ) => {
    onChange({
      conditions: conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const removeCondition = (id: string) => {
    onChange({ conditions: conditions.filter((c) => c.id !== id) })
  }

  const defaultOperatorForField = (
    field: { type: string } | undefined,
  ): ReportFilterCondition['operator'] => {
    if (!field) return 'contains'
    if (
      field.type === 'lookup' ||
      field.type === 'picklist' ||
      field.type === 'boolean' ||
      field.type === 'number' ||
      field.type === 'date'
    ) {
      return 'equals'
    }
    return 'contains'
  }

  const handleFieldChange = (condId: string, fieldId: string) => {
    const field = fieldById.get(fieldId)
    updateCondition(condId, {
      fieldId,
      operator: defaultOperatorForField(field),
      value: '',
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
          <p className="text-xs text-muted-foreground">
            Cada condición tiene un número para combinarlas con Y u O.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addCondition}>
          <Plus aria-hidden className="size-4" />
          Condición
        </Button>
      </div>

      {conditions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Sin filtros: se mostrarán todas las filas de la fuente.
        </p>
      ) : (
        <ul className="space-y-3">
          {conditions.map((cond, index) => {
            const needsValue = operatorNeedsValue(cond.operator)
            const field = fieldById.get(cond.fieldId)
            return (
              <li
                key={cond.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-end"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-label={`Condición ${index + 1}`}
                >
                  {index + 1}
                </span>
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                  <ContactFormSelect
                    id={`${cond.id}-field`}
                    label="Campo"
                    value={cond.fieldId}
                    onChange={(fieldId) => handleFieldChange(cond.id, fieldId)}
                    options={fieldOptions}
                  />
                  <ContactFormSelect
                    id={`${cond.id}-op`}
                    label="Operador"
                    value={cond.operator}
                    onChange={(operator) =>
                      updateCondition(cond.id, {
                        operator: operator as ReportFilterCondition['operator'],
                      })
                    }
                    options={operatorOptions}
                  />
                  {needsValue ? (
                    conditionValueInput({
                      condId: cond.id,
                      fieldType: field?.type ?? 'text',
                      label: 'Valor',
                      value: cond.value,
                      options: field?.options,
                      onChange: (value) => updateCondition(cond.id, { value }),
                    })
                  ) : (
                    <div className="flex items-end pb-2 text-xs text-muted-foreground">
                      Sin valor
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Eliminar condición ${index + 1}`}
                  onClick={() => removeCondition(cond.id)}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {conditions.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Combinar condiciones
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMBINE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-2.5 transition-colors',
                  combineMode === opt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40',
                )}
              >
                <input
                  type="radio"
                  name="filter-combine"
                  className="sr-only"
                  checked={combineMode === opt.value}
                  onChange={() => onChange({ combineMode: opt.value })}
                />
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {opt.hint}
                </span>
              </label>
            ))}
          </div>

          {combineMode === 'custom' ? (
            <div className="space-y-2">
              <ContactFormInput
                id="filter-custom-expr"
                label="Expresión personalizada"
                value={customExpression}
                onChange={(customExpression) => onChange({ customExpression })}
                placeholder="1 Y 2 O ((3 Y 4) O 5)"
              />
              <p className="text-xs text-muted-foreground">
                Usa los números de cada condición, <strong>Y</strong> (AND),{' '}
                <strong>O</strong> (OR) y paréntesis. También puedes escribir AND/OR en
                inglés.
              </p>
              {expressionError ? (
                <p className="text-xs text-amber-700 dark:text-amber-300" role="alert">
                  {expressionError}
                </p>
              ) : customExpression.trim() ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Expresión válida.
                </p>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  )
}
