import { getAllKnownCompanies } from '@/data/companies-registry-store'
import { getAllKnownExpenses } from '@/data/expenses-registry-store'
import { getAllKnownInventory } from '@/data/inventory-registry-store'
import { getAllKnownInvoices } from '@/data/invoices-registry-store'
import { getAllKnownOpportunities } from '@/data/opportunities-registry-store'
import { getAllRegistryPurchases } from '@/data/purchases-registry-store'
import { getAllKnownProjects } from '@/data/projects-registry-store'
import { getAllKnownQuotes } from '@/data/quotes-registry-store'
import { getRegistryActivities } from '@/data/activities-registry-store'
import { getAllRegistryStockReceipts } from '@/data/stock-receipts-registry-store'
import { getAllKnownContacts } from '@/lib/contact-lookup'
import { getAllKnownProducts } from '@/lib/product-lookup'
import { STORAGE_PREFIX } from '@/config/brand'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import type {
  ReportDataSourceId,
  ReportFieldDef,
  ReportFieldType,
  ReportTableRow,
} from '@/types/report-table'

type SourceDef = {
  fields: ReportFieldDef[]
  rows: ReportTableRow[]
}

type JoinOption = {
  id: string
  label: string
  relatedSource: ReportDataSourceId
  /** Campo en fila base (ej. companyId). */
  baseKey: string
  /** Campo en fila relacionada (típicamente id). */
  relatedKey: string
  /** Prefijo para columnas relacionadas. */
  prefixLabel: string
  prefixId: string
}

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

function toIsoDate(value: string): string {
  const trimmed = (value ?? '').toString().trim()
  if (!trimmed) return ''

  // ISO datetime or ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }

  // e.g. "30 jun 2024" or "12 may, 16:00" (we only keep date)
  const parts = trimmed
    .replace(',', '')
    .split(/\s+/)
    .filter(Boolean)

  // Support "Hoy"/"Ayer" in demo strings by leaving raw (can't be converted deterministically).
  if (parts[0]?.toLowerCase() === 'hoy' || parts[0]?.toLowerCase() === 'ayer') {
    return ''
  }

  if (parts.length >= 3) {
    const day = Number.parseInt(parts[0] ?? '', 10)
    const monthKey = (parts[1] ?? '').replace(/\./g, '').toLowerCase().slice(0, 3)
    const year = Number.parseInt(parts[2] ?? '', 10)
    const month = MONTHS_ES[monthKey]
    if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
      const d = new Date(year, month, day, 12, 0, 0)
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }

  return ''
}

function fieldBaseName(id: string): string {
  const dot = id.lastIndexOf('.')
  return dot >= 0 ? id.slice(dot + 1) : id
}

function labelFromId(id: string): string {
  if (REPORT_FIELD_LABELS[id]) return REPORT_FIELD_LABELS[id]!
  const base = fieldBaseName(id)
  if (REPORT_FIELD_LABELS[base]) return REPORT_FIELD_LABELS[base]!
  const withSpaces = id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
  return withSpaces ? withSpaces[0]!.toUpperCase() + withSpaces.slice(1) : id
}

/** Si existe el nombre visible, no exponer el *Id en columnas/filtros. */
const LOOKUP_ID_TO_DISPLAY: Record<string, string[]> = {
  companyId: ['company', 'companyName'],
  contactId: ['contactName', 'contact'],
  supplierId: ['supplier'],
  quoteId: ['code'],
  opportunityId: ['opportunityName', 'opportunity'],
  purchaseId: ['purchaseReference', 'purchase'],
  productId: ['productName', 'product'],
  relatedId: ['relatedName'],
  ownerUserId: ['owner', 'ownerName'],
  assigneeUserId: ['assignee'],
  partnerUserId: ['partnerName'],
  warehouseId: ['warehouse', 'location'],
  destinationWarehouseId: ['destinationWarehouse', 'warehouse'],
}

/** Etiquetas en español para columnas y filtros de reportes. */
const REPORT_FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  name: 'Nombre',
  subtitle: 'Subtítulo',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  mobilePhone: 'Teléfono móvil',
  role: 'Cargo',
  rut: 'RUT',
  streetAddress: 'Dirección',
  region: 'Región',
  commune: 'Comuna',
  city: 'Ciudad',
  linkedIn: 'LinkedIn',
  source: 'Origen',
  initialNote: 'Nota inicial',
  ownerName: 'Propietario',
  owner: 'Propietario',
  lastContactLabel: 'Último contacto',
  lastOutreachAt: 'Fecha último intento',
  lastOutreachChannel: 'Canal último intento',
  lastOutreachResult: 'Resultado último intento',
  lastOutreachLabel: 'Etiqueta último intento',
  reachabilityStatus: 'Contactabilidad',
  outreachAttemptCount: 'Cantidad de intentos',
  company: 'Empresa',
  companyName: 'Empresa',
  companyId: 'ID empresa',
  contactName: 'Contacto',
  contact: 'Contacto',
  contactId: 'ID contacto',
  status: 'Estado',
  industry: 'Industria',
  headquartersStreet: 'Dirección sede',
  employees: 'Empleados',
  lifecycle: 'Ciclo de vida',
  operationalStatus: 'Estado operacional',
  lastActivity: 'Última actividad',
  customerKind: 'Tipo de cliente',
  stage: 'Etapa',
  amount: 'Monto',
  amountNum: 'Monto (número)',
  weightedAmount: 'Monto ponderado',
  probability: 'Probabilidad',
  closeDate: 'Fecha cierre',
  type: 'Tipo',
  priority: 'Prioridad',
  outcome: 'Resultado',
  forecast: 'Pronóstico',
  contactEmail: 'Email contacto',
  contactPhone: 'Teléfono contacto',
  description: 'Descripción',
  decisionMaker: 'Decisor',
  competitors: 'Competidores',
  budget: 'Presupuesto',
  buyingProcess: 'Proceso de compra',
  lossReason: 'Motivo pérdida',
  primaryQuoteId: 'Cotización principal',
  title: 'Título',
  typeLabel: 'Etiqueta tipo',
  relatedType: 'Tipo relacionado',
  relatedId: 'ID relacionado',
  relatedName: 'Registro relacionado',
  due: 'Vencimiento',
  assignee: 'Asignado a',
  reminder: 'Recordatorio',
  scheduledAt: 'Programada para',
  reminderAt: 'Recordatorio en',
  sku: 'SKU',
  category: 'Categoría',
  productType: 'Tipo de producto',
  unitOfMeasure: 'Unidad de medida',
  billingPeriod: 'Periodo de facturación',
  price: 'Precio',
  priceNum: 'Precio (número)',
  priceCurrency: 'Moneda precio',
  costPrice: 'Costo',
  costPriceNum: 'Costo (número)',
  stock: 'Stock',
  stockNum: 'Stock (número)',
  barcode: 'Código de barras',
  number: 'Número',
  client: 'Cliente',
  clientName: 'Cliente',
  issueDate: 'Fecha emisión',
  dueDate: 'Fecha vencimiento',
  quoteId: 'ID cotización',
  paymentMethod: 'Forma de pago',
  siiNumber: 'Folio SII',
  progress: 'Avance',
  progressNum: 'Avance (número)',
  deadline: 'Fecha límite',
  manager: 'Responsable',
  journeyStage: 'Etapa del flujo',
  health: 'Salud',
  startDate: 'Fecha inicio',
  endDate: 'Fecha término',
  opportunityId: 'ID oportunidad',
  opportunityName: 'Oportunidad',
  opportunity: 'Oportunidad',
  acceptedQuoteId: 'Cotización aceptada',
  code: 'Código',
  validUntil: 'Válida hasta',
  reference: 'Referencia',
  supplier: 'Proveedor',
  supplierId: 'ID proveedor',
  productSummary: 'Resumen productos',
  orderDate: 'Fecha orden',
  externalReference: 'Referencia externa',
  purchaseId: 'ID compra',
  purchaseReference: 'Compra',
  purchase: 'Compra',
  confirmedAt: 'Fecha confirmación',
  warehouse: 'Bodega',
  lineCount: 'Cantidad de líneas',
  productName: 'Producto',
  product: 'Producto',
  productId: 'ID producto',
  location: 'Ubicación / bodega',
  quantity: 'Cantidad',
  quantityNum: 'Cantidad (número)',
  reservedQtyNum: 'Cantidad reservada',
  availableQtyNum: 'Cantidad disponible',
  onHandQtyNum: 'Cantidad en mano',
  minStock: 'Stock mínimo',
  minStockNum: 'Stock mínimo (número)',
  lastMovement: 'Último movimiento',
  when: 'Cuándo',
  createdAtDate: 'Fecha creación',
  updatedAtDate: 'Fecha modificación',
  createdByName: 'Creado por',
  updatedByName: 'Modificado por',
  concept: 'Concepto',
  expenseDate: 'Fecha gasto',
  currency: 'Moneda',
  supplierName: 'Proveedor',
  isPartnerLoan: 'Préstamo de socio',
  partnerUserId: 'ID socio',
  partnerName: 'Socio',
  partnerLoanReturned: 'Préstamo devuelto',
  documentationUrl: 'URL documentación',
  gitBranchUrl: 'URL rama Git',
  solicitudId: 'ID solicitud',
  solicitudCode: 'Código solicitud',
  solicitudTitle: 'Solicitud',
  workDate: 'Fecha trabajo',
  hours: 'Horas',
  isBillable: 'Facturable',
  nonBillableReason: 'Motivo no facturable',
  assignedUserId: 'ID usuario asignado',
  assignedUserName: 'Usuario asignado',
}

const HIDDEN_REPORT_FIELDS = new Set([
  'avatarUrl',
  'logoUrl',
  'imageUrl',
  'createdById',
  'updatedById',
])

/** Campo principal del join → etiqueta corta (sin «Empresa · Nombre»). */
const JOIN_PRIMARY_DISPLAY: Record<string, string> = {
  empresa: 'name',
  proveedor: 'name',
  cotizacion: 'code',
  compra: 'reference',
  solicitud: 'code',
}

/** Con join activo, ocultar en la fuente base lo que ya aporta la relación. */
const JOIN_HIDES_BASE_FIELDS: Record<string, string[]> = {
  'contactos->empresas': ['company', 'companyName', 'companyId'],
  'oportunidades->empresas': ['company', 'companyId'],
  'compras->empresas': ['supplier', 'supplierId'],
  'ingresos->compras': ['purchaseReference', 'purchaseId'],
  'facturas->cotizaciones': ['quoteId'],
  'gastos->empresas': ['supplierName', 'supplierId', 'supplier'],
  'solicitudes->empresas': ['companyName', 'companyId'],
  'bitacora->solicitudes': ['solicitudCode', 'solicitudTitle', 'solicitudId'],
}

const LOOKUP_DISPLAY_BY_ID: Record<string, string[]> = {
  companyId: ['company', 'companyName'],
  contactId: ['contactName', 'contact'],
  supplierId: ['supplier'],
  quoteId: ['code', 'quote', 'quoteReference'],
  opportunityId: ['opportunityName', 'opportunity'],
  purchaseId: ['purchaseReference', 'purchase'],
  productId: ['productName', 'product'],
  relatedId: ['relatedName'],
  ownerUserId: ['owner', 'ownerName'],
  assigneeUserId: ['assignee'],
  partnerUserId: ['partnerName'],
  warehouseId: ['warehouse', 'location'],
  destinationWarehouseId: ['destinationWarehouse', 'warehouse'],
}

/** Campos que muestran el nombre de un registro relacionado (no *Id); no son picklists de estado. */
const LOOKUP_DISPLAY_FIELD_BASES = new Set([
  'company',
  'companyName',
  'supplier',
  'contact',
  'contactName',
  'relatedName',
  'owner',
  'ownerName',
  'assignee',
  'opportunityName',
  'opportunity',
  'productName',
  'product',
  'warehouse',
  'location',
  'purchaseReference',
  'purchase',
  'code',
  'customer',
  'partnerName',
  'solicitudTitle',
  'solicitudCode',
  'assignedUserName',
])

function shouldHideReportField(id: string, allKeys: string[]): boolean {
  if (HIDDEN_REPORT_FIELDS.has(id) || HIDDEN_REPORT_FIELDS.has(fieldBaseName(id))) {
    return true
  }
  if (id === 'companyName' && allKeys.includes('company')) return true
  if (id === 'contact' && allKeys.includes('contactName')) return true

  if (id.includes('.') && fieldBaseName(id) === 'id') {
    const prefix = id.slice(0, id.lastIndexOf('.'))
    const primary = JOIN_PRIMARY_DISPLAY[prefix]
    if (primary && allKeys.includes(`${prefix}.${primary}`)) return true
  }

  const displayCandidates = LOOKUP_ID_TO_DISPLAY[id]
  if (displayCandidates?.some((k) => allKeys.includes(k))) return true

  return false
}

function reportFieldLabel(id: string, fallback: string, join?: JoinOption): string {
  if (REPORT_FIELD_LABELS[id]) return REPORT_FIELD_LABELS[id]!

  if (join) {
    const primary = JOIN_PRIMARY_DISPLAY[join.prefixId]
    if (primary && id === `${join.prefixId}.${primary}`) {
      return join.prefixLabel
    }
  }

  const base = fieldBaseName(id)
  if (REPORT_FIELD_LABELS[base]) return REPORT_FIELD_LABELS[base]!

  return fallback
}

function filterReportFields(
  fields: ReportFieldDef[],
  options?: { join?: JoinOption },
): ReportFieldDef[] {
  const allIds = fields.map((f) => f.id)
  const hideFromJoin = options?.join
    ? (JOIN_HIDES_BASE_FIELDS[options.join.id] ?? [])
    : []

  return fields
    .filter(
      (f) =>
        !shouldHideReportField(f.id, allIds) && !hideFromJoin.includes(f.id),
    )
    .map((f) => ({
      ...f,
      label: reportFieldLabel(f.id, f.label, options?.join),
    }))
}

function isLookupFieldId(id: string): boolean {
  if (id === 'id') return false
  if (id === 'relatedId') return true
  if (/Id$/.test(id)) return true
  if (id.includes('.') && id.endsWith('.id')) return true
  return false
}

function isLookupDisplayField(id: string): boolean {
  if (LOOKUP_DISPLAY_FIELD_BASES.has(fieldBaseName(id))) return true
  // Columnas traídas por join (ej. empresa.name, proveedor.name, cotizacion.code)
  return /^(empresa|proveedor|cotizacion|compra)\.(name|code|reference|title)$/i.test(
    id,
  )
}

function displayFieldForLookupId(id: string, allKeys: string[]): string | null {
  if (id.includes('.')) {
    const dot = id.lastIndexOf('.')
    const prefix = id.slice(0, dot)
    const suffix = id.slice(dot + 1)
    if (suffix === 'id') {
      for (const cand of ['name', 'nombre', 'reference', 'title', 'label']) {
        const key = `${prefix}.${cand}`
        if (allKeys.includes(key)) return key
      }
    }
  }

  const known = LOOKUP_DISPLAY_BY_ID[id]
  if (known) {
    for (const key of known) {
      if (allKeys.includes(key)) return key
    }
  }

  if (id.endsWith('Id')) {
    const stem = id.slice(0, -2)
    if (allKeys.includes(stem)) return stem
    const stemName = `${stem}Name`
    if (allKeys.includes(stemName)) return stemName
  }

  return null
}

function guessFieldType(id: string, values: string[]): ReportFieldType {
  if (isLookupFieldId(id) || isLookupDisplayField(id)) return 'lookup'

  const lower = id.toLowerCase()
  if (lower === 'createdatdate' || lower === 'updatedatdate') return 'date'
  if (lower.endsWith('date') || lower.endsWith('at')) return 'date'

  const numericHint = [
    'amount',
    'weightedamount',
    'probability',
    'price',
    'cost',
    'stock',
    'budget',
    'employees',
    'progress',
    'hours',
    'percent',
    'qty',
    'quantity',
  ].some((k) => lower.includes(k))
  if (numericHint) return 'number'

  // Picklist heuristic: low-cardinality text fields (excluye *Id ya marcados como lookup).
  const uniq = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)))
  if (uniq.length > 0 && uniq.length <= 20) return 'picklist'

  return 'text'
}

function optionsFromValues(values: string[]): { value: string; label: string }[] {
  const uniq = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)))
  uniq.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  return uniq.map((v) => ({ value: v, label: v }))
}

function lookupOptionsFromRows(
  fieldId: string,
  rows: ReportTableRow[],
  allKeys: string[],
): { value: string; label: string }[] {
  const displayKey = displayFieldForLookupId(fieldId, allKeys)
  const map = new Map<string, string>()

  for (const row of rows) {
    const valueId = (row[fieldId] ?? '').trim()
    if (!valueId) continue
    const label = displayKey
      ? (row[displayKey] ?? '').trim() || valueId
      : valueId
    if (!map.has(valueId)) map.set(valueId, label)
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
}

function enrichLookupOptions(
  fieldId: string,
  options: { value: string; label: string }[],
): { value: string; label: string }[] {
  const map = new Map(options.map((o) => [o.value, o.label]))

  const add = (id: string, label: string) => {
    const key = id.trim()
    const text = label.trim()
    if (!key) return
    if (!map.has(key) || map.get(key) === key) {
      map.set(key, text || key)
    }
  }

  const baseId = fieldId.includes('.') ? fieldId.split('.').pop() ?? fieldId : fieldId

  if (baseId === 'companyId' || baseId === 'supplierId') {
    for (const c of getAllKnownCompanies()) add(c.id, c.name)
  }
  if (baseId === 'contactId') {
    for (const c of getAllKnownContacts()) add(c.id, c.name)
  }
  if (baseId === 'quoteId') {
    for (const q of getAllKnownQuotes()) {
      add(q.id, q.code)
    }
  }
  if (baseId === 'purchaseId') {
    for (const p of getAllRegistryPurchases()) add(p.id, p.reference)
  }
  if (baseId === 'productId') {
    for (const p of getAllKnownProducts()) add(p.id, p.name)
  }
  if (baseId === 'relatedId') {
    for (const c of getAllKnownContacts()) add(c.id, c.name)
    for (const co of getAllKnownCompanies()) add(co.id, co.name)
    for (const o of getAllKnownOpportunities()) add(o.id, o.name)
    for (const q of getAllKnownQuotes()) add(q.id, q.code)
    for (const p of getAllRegistryPurchases()) add(p.id, p.reference)
    for (const pr of getAllKnownProjects()) add(pr.id, pr.name)
    for (const p of getAllKnownProducts()) add(p.id, p.name)
    for (const sr of getAllRegistryStockReceipts()) add(sr.id, sr.number)
    for (const inv of getAllKnownInvoices()) add(inv.id, inv.number)
    for (const row of getAllKnownInventory()) {
      add(row.id, `${row.productName} · ${row.sku}`)
    }
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
}

function enrichLookupOptionsForDisplay(
  fieldId: string,
  options: { value: string; label: string }[],
): { value: string; label: string }[] {
  const map = new Map(options.map((o) => [o.value, o.label]))

  const add = (value: string, label: string) => {
    const key = value.trim()
    const text = label.trim()
    if (!key) return
    if (!map.has(key)) map.set(key, text || key)
  }

  const baseId = fieldBaseName(fieldId)
  const prefix = fieldId.includes('.') ? fieldId.slice(0, fieldId.indexOf('.')) : ''

  const isCompanyLike =
    baseId === 'company' ||
    baseId === 'companyName' ||
    baseId === 'supplier' ||
    (baseId === 'name' && prefix === 'empresa') ||
    (baseId === 'name' && prefix === 'proveedor')

  if (isCompanyLike) {
    for (const c of getAllKnownCompanies()) add(c.name, c.name)
  }
  if (baseId === 'contactName' || baseId === 'contact') {
    for (const c of getAllKnownContacts()) add(c.name, c.name)
  }
  if (baseId === 'opportunityName' || baseId === 'opportunity') {
    for (const o of getAllKnownOpportunities()) add(o.name, o.name)
  }
  if (baseId === 'productName' || baseId === 'product') {
    for (const p of getAllKnownProducts()) add(p.name, p.name)
  }
  if (baseId === 'code') {
    for (const q of getAllKnownQuotes()) add(q.code, q.code)
  }
  if (
    baseId === 'purchaseReference' ||
    baseId === 'purchase' ||
    baseId === 'reference' ||
    prefix === 'compra'
  ) {
    for (const p of getAllRegistryPurchases()) add(p.reference, p.reference)
  }
  if (baseId === 'relatedName') {
    for (const c of getAllKnownContacts()) add(c.name, c.name)
    for (const co of getAllKnownCompanies()) add(co.name, co.name)
    for (const o of getAllKnownOpportunities()) add(o.name, o.name)
    for (const q of getAllKnownQuotes()) add(q.code, q.code)
    for (const p of getAllRegistryPurchases()) add(p.reference, p.reference)
    for (const pr of getAllKnownProjects()) add(pr.name, pr.name)
    for (const p of getAllKnownProducts()) add(p.name, p.name)
    for (const sr of getAllRegistryStockReceipts()) add(sr.number, sr.number)
    for (const inv of getAllKnownInvoices()) add(inv.number, inv.number)
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
}

function buildLookupOptions(
  fieldId: string,
  rows: ReportTableRow[],
  allKeys: string[],
): { value: string; label: string }[] {
  if (isLookupFieldId(fieldId)) {
    return enrichLookupOptions(
      fieldId,
      lookupOptionsFromRows(fieldId, rows, allKeys),
    )
  }
  if (isLookupDisplayField(fieldId)) {
    const values = rows.map((r) => (r[fieldId] ?? '').toString())
    return enrichLookupOptionsForDisplay(fieldId, optionsFromValues(values))
  }
  return []
}

function buildFromSeeds(
  seeds: Array<Record<string, unknown>>,
  dateFieldIds: string[] = [],
  sourceId?: ReportDataSourceId,
): SourceDef {
  const rows: ReportTableRow[] = seeds.map((raw) => {
    const r: ReportTableRow = {}
    for (const [k, v] of Object.entries(raw)) {
      r[k] = v == null ? '' : String(v)
    }

    // Auditoría requerida (se muestra como 4 columnas estándar)
    const createdAt = (r.createdAt ?? '').toString()
    const updatedAt = (r.updatedAt ?? '').toString()
    r.createdAtDate = toIsoDate(createdAt)
    r.updatedAtDate = toIsoDate(updatedAt)

    // Normalización adicional de fechas conocidas de negocio (para datepicker)
    for (const id of dateFieldIds) {
      r[id] = toIsoDate(r[id] ?? '') || (r[id] ?? '')
    }

    return r
  })

  const templateKeys = sourceId ? (SOURCE_FIELD_TEMPLATES[sourceId] ?? []) : []
  const allKeys = Array.from(
    new Set([...templateKeys, ...rows.flatMap((r) => Object.keys(r))]),
  )

  // Orden: ID + auditoría + resto ordenado por label
  const pinned = ['id', 'createdByName', 'createdAtDate', 'updatedByName', 'updatedAtDate']
  const rest = allKeys.filter((k) => !pinned.includes(k))
  rest.sort((a, b) => labelFromId(a).localeCompare(labelFromId(b), 'es', { sensitivity: 'base' }))
  const orderedKeys = [...pinned.filter((k) => allKeys.includes(k)), ...rest]

  const rawFields: ReportFieldDef[] = orderedKeys.map((id) => {
    const values = rows.map((r) => (r[id] ?? '').toString())
    const type = guessFieldType(id, values)
    const base: ReportFieldDef = { id, label: labelFromId(id), type }
    if (type === 'picklist') {
      base.options = optionsFromValues(values)
    }
    if (type === 'lookup') {
      base.options = buildLookupOptions(id, rows, allKeys)
    }
    return base
  })

  return { fields: filterReportFields(rawFields), rows }
}

function buildContactos(): SourceDef {
  return buildFromSeeds(
    getAllKnownContacts() as unknown as Array<Record<string, unknown>>,
    ['lastOutreachAt'],
    'contactos',
  )
}

function buildEmpresas(): SourceDef {
  return buildFromSeeds(
    getAllKnownCompanies() as unknown as Array<Record<string, unknown>>,
    [],
    'empresas',
  )
}

function buildOportunidades(): SourceDef {
  return buildFromSeeds(
    getAllKnownOpportunities() as unknown as Array<Record<string, unknown>>,
    ['closeDate'],
    'oportunidades',
  )
}

function buildActividades(): SourceDef {
  return buildFromSeeds(
    getRegistryActivities() as unknown as Array<Record<string, unknown>>,
    ['due', 'scheduledAt', 'reminderAt'],
    'actividades',
  )
}

function buildProductos(): SourceDef {
  return buildFromSeeds(
    getAllKnownProducts() as unknown as Array<Record<string, unknown>>,
    [],
    'productos',
  )
}

function buildFacturas(): SourceDef {
  return buildFromSeeds(
    getAllKnownInvoices() as unknown as Array<Record<string, unknown>>,
    ['issueDate', 'dueDate'],
    'facturas',
  )
}

function buildProyectos(): SourceDef {
  return buildFromSeeds(
    getAllKnownProjects() as unknown as Array<Record<string, unknown>>,
    ['deadline', 'startDate'],
    'proyectos',
  )
}

function buildCotizaciones(): SourceDef {
  return buildFromSeeds(
    getAllKnownQuotes() as unknown as Array<Record<string, unknown>>,
    ['validUntil', 'issueDate'],
    'cotizaciones',
  )
}

function buildCompras(): SourceDef {
  return buildFromSeeds(
    getAllRegistryPurchases() as unknown as Array<Record<string, unknown>>,
    ['orderDate'],
    'compras',
  )
}

function buildIngresos(): SourceDef {
  return buildFromSeeds(
    getAllRegistryStockReceipts() as unknown as Array<Record<string, unknown>>,
    ['confirmedAt'],
    'ingresos',
  )
}

function buildInventario(): SourceDef {
  return buildFromSeeds(
    getAllKnownInventory() as unknown as Array<Record<string, unknown>>,
    [],
    'inventario',
  )
}

function readLocalList<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function buildGastos(): SourceDef {
  return buildFromSeeds(
    getAllKnownExpenses() as unknown as Array<Record<string, unknown>>,
    ['expenseDate'],
    'gastos',
  )
}

function buildSolicitudes(): SourceDef {
  const items = readLocalList<SolicitudListItem>(`${STORAGE_PREFIX}-crm-user-solicitudes`)
  return buildFromSeeds(
    items as unknown as Array<Record<string, unknown>>,
    [],
    'solicitudes',
  )
}

function buildBitacora(): SourceDef {
  const items = readLocalList<BitacoraListItem>(`${STORAGE_PREFIX}-crm-user-bitacora`)
  return buildFromSeeds(
    items as unknown as Array<Record<string, unknown>>,
    ['workDate'],
    'bitacora',
  )
}

/** Campos estables por fuente (alineados con el backend) aunque no haya filas en memoria. */
const SOURCE_FIELD_TEMPLATES: Record<ReportDataSourceId, string[]> = {
  contactos: [
    'id',
    'name',
    'subtitle',
    'email',
    'phone',
    'mobilePhone',
    'role',
    'rut',
    'streetAddress',
    'region',
    'commune',
    'company',
    'companyId',
    'status',
    'source',
    'linkedIn',
    'initialNote',
    'ownerName',
    'lastContactLabel',
    'lastOutreachAt',
    'lastOutreachChannel',
    'lastOutreachResult',
    'lastOutreachLabel',
    'reachabilityStatus',
    'outreachAttemptCount',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  empresas: [
    'id',
    'name',
    'rut',
    'industry',
    'headquartersStreet',
    'city',
    'employees',
    'owner',
    'lifecycle',
    'operationalStatus',
    'lastActivity',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  oportunidades: [
    'id',
    'name',
    'customerKind',
    'company',
    'companyId',
    'contactId',
    'contactName',
    'stage',
    'amount',
    'weightedAmount',
    'probability',
    'closeDate',
    'owner',
    'type',
    'priority',
    'outcome',
    'forecast',
    'source',
    'contactEmail',
    'contactPhone',
    'description',
    'decisionMaker',
    'competitors',
    'budget',
    'buyingProcess',
    'lossReason',
    'primaryQuoteId',
    'lastActivity',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  actividades: [
    'id',
    'title',
    'type',
    'typeLabel',
    'status',
    'priority',
    'due',
    'scheduledAt',
    'reminderAt',
    'reminder',
    'relatedType',
    'relatedName',
    'companyName',
    'assignee',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  productos: [
    'id',
    'name',
    'sku',
    'category',
    'productType',
    'unitOfMeasure',
    'billingPeriod',
    'price',
    'priceNum',
    'priceCurrency',
    'costPrice',
    'costPriceNum',
    'stock',
    'stockNum',
    'barcode',
    'status',
    'owner',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  facturas: [
    'id',
    'number',
    'client',
    'customerKind',
    'contactName',
    'companyName',
    'amount',
    'amountNum',
    'status',
    'issueDate',
    'dueDate',
    'owner',
    'quoteId',
    'paymentMethod',
    'siiNumber',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  proyectos: [
    'id',
    'name',
    'client',
    'customerKind',
    'companyName',
    'contactName',
    'status',
    'journeyStage',
    'health',
    'priority',
    'progress',
    'progressNum',
    'budget',
    'manager',
    'startDate',
    'deadline',
    'opportunityId',
    'acceptedQuoteId',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  cotizaciones: [
    'id',
    'code',
    'title',
    'companyName',
    'contactName',
    'amount',
    'status',
    'validUntil',
    'issueDate',
    'owner',
    'customerKind',
    'opportunityId',
    'opportunityName',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  compras: [
    'id',
    'reference',
    'supplier',
    'supplierId',
    'productSummary',
    'amount',
    'amountNum',
    'status',
    'orderDate',
    'owner',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  ingresos: [
    'id',
    'number',
    'status',
    'externalReference',
    'purchaseId',
    'purchaseReference',
    'supplier',
    'warehouse',
    'productSummary',
    'lineCount',
    'confirmedAt',
    'owner',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  inventario: [
    'id',
    'productName',
    'sku',
    'location',
    'quantity',
    'quantityNum',
    'reservedQtyNum',
    'availableQtyNum',
    'onHandQtyNum',
    'minStock',
    'minStockNum',
    'status',
    'lastMovement',
    'createdAtDate',
    'updatedAtDate',
  ],
  gastos: [
    'id',
    'number',
    'concept',
    'category',
    'expenseDate',
    'amount',
    'amountNum',
    'currency',
    'paymentMethod',
    'status',
    'documentType',
    'documentFolio',
    'supplierId',
    'supplierName',
    'owner',
    'isPartnerLoan',
    'partnerName',
    'partnerLoanReturned',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  solicitudes: [
    'id',
    'code',
    'title',
    'description',
    'status',
    'priority',
    'assignee',
    'assigneeUserId',
    'companyId',
    'companyName',
    'documentationUrl',
    'gitBranchUrl',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
  bitacora: [
    'id',
    'solicitudId',
    'solicitudCode',
    'solicitudTitle',
    'workDate',
    'hours',
    'description',
    'isBillable',
    'nonBillableReason',
    'assignedUserId',
    'assignedUserName',
    'companyId',
    'companyName',
    'createdByName',
    'createdAtDate',
    'updatedByName',
    'updatedAtDate',
  ],
}

function buildSourceFromTemplate(sourceId: ReportDataSourceId): SourceDef {
  const keys = SOURCE_FIELD_TEMPLATES[sourceId] ?? ['id']
  const fields: ReportFieldDef[] = keys.map((id) => ({
    id,
    label: labelFromId(id),
    type: guessFieldType(id, []),
  }))
  return { fields: filterReportFields(fields), rows: [] }
}

function ensureSourceFields(sourceId: ReportDataSourceId, def: SourceDef): SourceDef {
  if (def.fields.length > 0) return def
  return buildSourceFromTemplate(sourceId)
}

const SOURCE_BUILDERS: Record<ReportDataSourceId, () => SourceDef> = {
  contactos: buildContactos,
  empresas: buildEmpresas,
  oportunidades: buildOportunidades,
  actividades: buildActividades,
  productos: buildProductos,
  facturas: buildFacturas,
  proyectos: buildProyectos,
  cotizaciones: buildCotizaciones,
  compras: buildCompras,
  ingresos: buildIngresos,
  inventario: buildInventario,
  gastos: buildGastos,
  solicitudes: buildSolicitudes,
  bitacora: buildBitacora,
}

const JOIN_OPTIONS: Record<ReportDataSourceId, JoinOption[]> = {
  contactos: [
    {
      id: 'contactos->empresas',
      label: 'Empresa (lookup)',
      relatedSource: 'empresas',
      baseKey: 'companyId',
      relatedKey: 'id',
      prefixLabel: 'Empresa',
      prefixId: 'empresa',
    },
  ],
  compras: [
    {
      id: 'compras->empresas',
      label: 'Proveedor (empresa)',
      relatedSource: 'empresas',
      baseKey: 'supplierId',
      relatedKey: 'id',
      prefixLabel: 'Proveedor',
      prefixId: 'proveedor',
    },
  ],
  ingresos: [
    {
      id: 'ingresos->compras',
      label: 'Compra (OC)',
      relatedSource: 'compras',
      baseKey: 'purchaseId',
      relatedKey: 'id',
      prefixLabel: 'Compra',
      prefixId: 'compra',
    },
  ],
  oportunidades: [
    {
      id: 'oportunidades->empresas',
      label: 'Empresa (lookup)',
      relatedSource: 'empresas',
      baseKey: 'companyId',
      relatedKey: 'id',
      prefixLabel: 'Empresa',
      prefixId: 'empresa',
    },
  ],
  facturas: [
    {
      id: 'facturas->cotizaciones',
      label: 'Cotización',
      relatedSource: 'cotizaciones',
      baseKey: 'quoteId',
      relatedKey: 'id',
      prefixLabel: 'Cotización',
      prefixId: 'cotizacion',
    },
  ],
  // Sin joins por ahora (se pueden agregar después)
  empresas: [],
  actividades: [],
  productos: [],
  proyectos: [],
  cotizaciones: [],
  inventario: [],
  gastos: [
    {
      id: 'gastos->empresas',
      label: 'Proveedor (empresa)',
      relatedSource: 'empresas',
      baseKey: 'supplierId',
      relatedKey: 'id',
      prefixLabel: 'Proveedor',
      prefixId: 'proveedor',
    },
  ],
  solicitudes: [
    {
      id: 'solicitudes->empresas',
      label: 'Empresa (lookup)',
      relatedSource: 'empresas',
      baseKey: 'companyId',
      relatedKey: 'id',
      prefixLabel: 'Empresa',
      prefixId: 'empresa',
    },
  ],
  bitacora: [
    {
      id: 'bitacora->solicitudes',
      label: 'Solicitud',
      relatedSource: 'solicitudes',
      baseKey: 'solicitudId',
      relatedKey: 'id',
      prefixLabel: 'Solicitud',
      prefixId: 'solicitud',
    },
  ],
}

export function getReportJoinOptions(sourceId: ReportDataSourceId): JoinOption[] {
  return JOIN_OPTIONS[sourceId] ?? []
}

function applyJoin(
  base: SourceDef,
  join: JoinOption,
): SourceDef {
  const related = SOURCE_BUILDERS[join.relatedSource]()
  const relatedById = new Map<string, ReportTableRow>()
  for (const r of related.rows) {
    const key = (r[join.relatedKey] ?? '').toString()
    if (key) relatedById.set(key, r)
  }

  const primaryJoinField = JOIN_PRIMARY_DISPLAY[join.prefixId]

  const relatedFieldsPrefixed: ReportFieldDef[] = related.fields
    .filter((f) => !(f.id === 'id' && primaryJoinField))
    .map((f) => {
      const id = `${join.prefixId}.${f.id}`
      const label =
        f.id === primaryJoinField
          ? join.prefixLabel
          : `${join.prefixLabel} · ${f.label}`
      return { ...f, id, label }
    })

  const rows: ReportTableRow[] = base.rows.map((r) => {
    const out: ReportTableRow = { ...r }
    const relId = (r[join.baseKey] ?? '').toString().trim()
    const rel = relId ? relatedById.get(relId) : undefined
    for (const f of related.fields) {
      out[`${join.prefixId}.${f.id}`] = rel ? (rel[f.id] ?? '') : ''
    }
    return out
  })

  return {
    fields: filterReportFields(
      [...base.fields, ...relatedFieldsPrefixed],
      { join },
    ),
    rows,
  }
}

export function getReportDataSource(
  sourceId: ReportDataSourceId,
  joinId?: string,
): SourceDef {
  const base = ensureSourceFields(sourceId, SOURCE_BUILDERS[sourceId]())
  if (!joinId) return base
  const join = (JOIN_OPTIONS[sourceId] ?? []).find((j) => j.id === joinId)
  if (!join) return base
  return applyJoin(base, join)
}

export function getReportDataSourceFields(
  sourceId: ReportDataSourceId,
  joinId?: string,
): ReportFieldDef[] {
  return getReportDataSource(sourceId, joinId).fields
}

export function getReportDataSourceRows(
  sourceId: ReportDataSourceId,
  joinId?: string,
): ReportTableRow[] {
  return getReportDataSource(sourceId, joinId).rows
}

export function getDefaultColumnIds(
  sourceId: ReportDataSourceId,
  joinId?: string,
): string[] {
  return getReportDataSourceFields(sourceId, joinId).map((f) => f.id)
}

export function getCellValue(row: ReportTableRow, fieldId: string): string {
  // Preferir companion ISO (p. ej. expenseDateIso) para filtros de fecha.
  const iso = row[`${fieldId}Iso`]
  if (iso != null && String(iso).trim()) return String(iso).trim()
  return (row[fieldId] ?? '').toString().trim()
}
