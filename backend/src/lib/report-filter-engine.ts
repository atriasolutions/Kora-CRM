import type {
  ReportFilterCombineMode,
  ReportFilterCondition,
  ReportTableRow,
} from '../types/report-table.js'

const MONTHS_ES: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
}

/** Preferir companion *Iso (p. ej. expenseDateIso) cuando exista. */
function getCellValue(row: ReportTableRow, fieldId: string): string {
  const iso = row[`${fieldId}Iso`]
  if (iso != null && String(iso).trim()) return String(iso).trim()
  return (row[fieldId] ?? '').toString().trim()
}

function normalizeForCompare(value: string): string {
  return value.trim().toLowerCase()
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function looksLikeDate(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(t)) return true
  if (/^\d{1,2}\s+[a-záéíóúüñ]{3,}\.?\s+,?\s*\d{4}/i.test(t)) return true
  return false
}

/** Normaliza a yyyy-mm-dd o null. Acepta ISO, dd/mm/yyyy y etiquetas es-CL («1 jul 2026»). */
export function parseFilterDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }

  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (slash) {
    const day = Number.parseInt(slash[1]!, 10)
    const month = Number.parseInt(slash[2]!, 10)
    let year = Number.parseInt(slash[3]!, 10)
    if (year < 100) year += 2000
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parts = trimmed.replace(',', '').split(/\s+/).filter(Boolean)
  if (parts.length >= 3) {
    const day = Number.parseInt(parts[0] ?? '', 10)
    const monthKey = (parts[1] ?? '').replace(/\./g, '').toLowerCase().slice(0, 3)
    const year = Number.parseInt(parts[2] ?? '', 10)
    const month = MONTHS_ES[monthKey]
    if (
      !Number.isNaN(day) &&
      month !== undefined &&
      !Number.isNaN(year) &&
      day >= 1 &&
      day <= 31
    ) {
      return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

/** -1 / 0 / 1 si se puede comparar; null si no. Fechas antes que números. */
function compareOrdered(raw: string, expected: string): number | null {
  const da = parseFilterDate(raw)
  const db = parseFilterDate(expected)
  if (da && db) {
    if (da < db) return -1
    if (da > db) return 1
    return 0
  }

  // Evitar parseNumber sobre fechas («1 jul 2026» → 12026).
  if (looksLikeDate(raw) || looksLikeDate(expected)) return null

  const a = parseNumber(raw)
  const b = parseNumber(expected)
  if (a !== null && b !== null) {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  return null
}

export function evaluateFilterCondition(
  row: ReportTableRow,
  condition: ReportFilterCondition,
): boolean {
  const raw = getCellValue(row, condition.fieldId)
  const op = condition.operator
  const expected = condition.value.trim()

  switch (op) {
    case 'is_empty':
      return raw.length === 0
    case 'is_not_empty':
      return raw.length > 0
    case 'equals': {
      const da = parseFilterDate(raw)
      const db = parseFilterDate(expected)
      if (da && db) return da === db
      return normalizeForCompare(raw) === normalizeForCompare(expected)
    }
    case 'not_equals': {
      const da = parseFilterDate(raw)
      const db = parseFilterDate(expected)
      if (da && db) return da !== db
      return normalizeForCompare(raw) !== normalizeForCompare(expected)
    }
    case 'contains':
      return normalizeForCompare(raw).includes(normalizeForCompare(expected))
    case 'not_contains':
      return !normalizeForCompare(raw).includes(normalizeForCompare(expected))
    case 'greater': {
      const cmp = compareOrdered(raw, expected)
      if (cmp !== null) return cmp > 0
      if (looksLikeDate(raw) || looksLikeDate(expected)) return false
      return raw.localeCompare(expected, 'es', { numeric: true }) > 0
    }
    case 'less': {
      const cmp = compareOrdered(raw, expected)
      if (cmp !== null) return cmp < 0
      if (looksLikeDate(raw) || looksLikeDate(expected)) return false
      return raw.localeCompare(expected, 'es', { numeric: true }) < 0
    }
    default:
      return true
  }
}

export function normalizeFilterExpression(expr: string): string {
  let s = expr.trim()
  s = s.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||')
  s = s.replace(/\bY\b/gi, '&&').replace(/\bO\b/gi, '||')
  // Formas pegadas: 1Y2 / 1O2
  s = s.replace(/(?<=\d)\s*[Yy]\s*(?=\d)/g, ' && ')
  s = s.replace(/(?<=\d)\s*[Oo]\s*(?=\d)/g, ' || ')
  s = s.replace(/\s+/g, ' ')
  return s
}

type LogicToken =
  | { kind: 'num'; index: number }
  | { kind: 'and' }
  | { kind: 'or' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }

function tokenizeLogicExpression(expr: string): LogicToken[] | { error: string } {
  const normalized = normalizeFilterExpression(expr)
  const tokens: LogicToken[] = []
  let i = 0

  while (i < normalized.length) {
    const ch = normalized[i]!
    if (ch === ' ') {
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' })
      i++
      continue
    }
    if (ch === '&' && normalized[i + 1] === '&') {
      tokens.push({ kind: 'and' })
      i += 2
      continue
    }
    if (ch === '|' && normalized[i + 1] === '|') {
      tokens.push({ kind: 'or' })
      i += 2
      continue
    }
    if (/\d/.test(ch)) {
      let num = ch
      i++
      while (i < normalized.length && /\d/.test(normalized[i]!)) {
        num += normalized[i]!
        i++
      }
      const index = Number.parseInt(num, 10)
      if (!Number.isFinite(index) || index < 1) {
        return { error: `Índice de condición inválido: ${num}` }
      }
      tokens.push({ kind: 'num', index })
      continue
    }
    return { error: `Carácter no permitido cerca de «${normalized.slice(i, i + 8)}»` }
  }

  return tokens
}

type AstNode =
  | { type: 'num'; index: number }
  | { type: 'and'; left: AstNode; right: AstNode }
  | { type: 'or'; left: AstNode; right: AstNode }

function parseLogicTokens(tokens: LogicToken[]): AstNode | { error: string } {
  let pos = 0

  function parseOr(): AstNode | { error: string } {
    let left = parseAnd()
    if ('error' in left) return left
    while (pos < tokens.length && tokens[pos]?.kind === 'or') {
      pos++
      const right = parseAnd()
      if ('error' in right) return right
      left = { type: 'or', left, right }
    }
    return left
  }

  function parseAnd(): AstNode | { error: string } {
    let left = parsePrimary()
    if ('error' in left) return left
    while (pos < tokens.length && tokens[pos]?.kind === 'and') {
      pos++
      const right = parsePrimary()
      if ('error' in right) return right
      left = { type: 'and', left, right }
    }
    return left
  }

  function parsePrimary(): AstNode | { error: string } {
    const tok = tokens[pos]
    if (!tok) return { error: 'Expresión incompleta.' }
    if (tok.kind === 'num') {
      pos++
      return { type: 'num', index: tok.index }
    }
    if (tok.kind === 'lparen') {
      pos++
      const inner = parseOr()
      if ('error' in inner) return inner
      if (tokens[pos]?.kind !== 'rparen') {
        return { error: 'Falta paréntesis de cierre.' }
      }
      pos++
      return inner
    }
    return { error: 'Se esperaba un número de condición o «(».' }
  }

  const ast = parseOr()
  if ('error' in ast) return ast
  if (pos < tokens.length) {
    return { error: 'Hay tokens sobrantes en la expresión.' }
  }
  return ast
}

function evalAst(node: AstNode, results: boolean[]): boolean | { error: string } {
  if (node.type === 'num') {
    const idx = node.index - 1
    if (idx < 0 || idx >= results.length) {
      return { error: `La condición ${node.index} no existe.` }
    }
    return results[idx]!
  }
  const left = evalAst(node.left, results)
  if (typeof left !== 'boolean') return left
  const right = evalAst(node.right, results)
  if (typeof right !== 'boolean') return right
  return node.type === 'and' ? left && right : left || right
}

function evaluateCustomExpression(
  expression: string,
  conditionResults: boolean[],
): boolean | { error: string } {
  const trimmed = expression.trim()
  if (!trimmed) {
    return { error: 'Escribe una expresión personalizada o cambia el modo de combinación.' }
  }

  const tokenized = tokenizeLogicExpression(trimmed)
  if ('error' in tokenized) return tokenized

  const ast = parseLogicTokens(tokenized)
  if ('error' in ast) return ast

  const value = evalAst(ast, conditionResults)
  if (typeof value !== 'boolean') return value
  return value
}

function combineConditionResults(
  results: boolean[],
  mode: ReportFilterCombineMode,
  customExpression: string,
): boolean | { error: string } {
  if (results.length === 0) return true

  switch (mode) {
    case 'all-and':
      return results.every(Boolean)
    case 'any-or':
      return results.some(Boolean)
    case 'custom':
      return evaluateCustomExpression(customExpression, results)
    default:
      return results.every(Boolean)
  }
}

export function filterReportRows(
  rows: ReportTableRow[],
  conditions: ReportFilterCondition[],
  mode: ReportFilterCombineMode,
  customExpression: string,
): { rows: ReportTableRow[]; error?: string } {
  if (conditions.length === 0) return { rows }

  const filtered: ReportTableRow[] = []
  for (const row of rows) {
    const results = conditions.map((c) => evaluateFilterCondition(row, c))
    const pass = combineConditionResults(results, mode, customExpression)
    if (typeof pass !== 'boolean') {
      return { rows: [], error: pass.error }
    }
    if (pass) filtered.push(row)
  }
  return { rows: filtered }
}
