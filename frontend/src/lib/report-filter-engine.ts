import { getCellValue } from '@/lib/report-data-sources'
import type {
  ReportFilterCombineMode,
  ReportFilterCondition,
  ReportFilterOperator,
  ReportTableRow,
} from '@/types/report-table'

function normalizeForCompare(value: string): string {
  return value.trim().toLowerCase()
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
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
    case 'equals':
      return normalizeForCompare(raw) === normalizeForCompare(expected)
    case 'not_equals':
      return normalizeForCompare(raw) !== normalizeForCompare(expected)
    case 'contains':
      return normalizeForCompare(raw).includes(normalizeForCompare(expected))
    case 'not_contains':
      return !normalizeForCompare(raw).includes(normalizeForCompare(expected))
    case 'greater': {
      const a = parseNumber(raw)
      const b = parseNumber(expected)
      if (a === null || b === null) {
        return raw.localeCompare(expected, 'es', { numeric: true }) > 0
      }
      return a > b
    }
    case 'less': {
      const a = parseNumber(raw)
      const b = parseNumber(expected)
      if (a === null || b === null) {
        return raw.localeCompare(expected, 'es', { numeric: true }) < 0
      }
      return a < b
    }
    default:
      return true
  }
}

export function operatorNeedsValue(op: ReportFilterOperator): boolean {
  return op !== 'is_empty' && op !== 'is_not_empty'
}

/** Normaliza expresión: Y/AND → &&, O/OR → ||, solo dígitos y operadores seguros. */
export function normalizeFilterExpression(expr: string): string {
  let s = expr.trim()
  s = s.replace(/\bAND\b/gi, 'Y').replace(/\bOR\b/gi, 'O')
  s = s.replace(/\bY\b/gi, '&&').replace(/\bO\b/gi, '||')
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
    return { error: 'Se esperaba un número de condición o «(». ' }
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

export function evaluateCustomExpression(
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

export function combineConditionResults(
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

export function validateCustomExpression(
  expression: string,
  conditionCount: number,
): string | null {
  if (!expression.trim()) {
    return 'Indica la expresión (ej: 1 Y 2 O ((3 Y 4) O 5)).'
  }
  const dummy = Array.from({ length: conditionCount }, () => true)
  const result = evaluateCustomExpression(expression, dummy)
  if (typeof result !== 'boolean') return result.error
  return null
}
