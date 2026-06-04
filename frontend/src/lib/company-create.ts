import type { CompanyListItem } from '@/data/companies.mock'
import {
  companyFormValuesToDetail,
  createDefaultCompanyFormValues,
  createCompanyId,
  listItemFromCompanyDetail,
  normalizeCompanyLifecycle,
  validateCompanyFormValues,
  type CompanyFormValues,
} from '@/lib/company-form'
import { inferCompanyIdentifierType, type TaxIdentifierType } from '@/lib/tax-identifier'

export type CreateCompanyFormValues = CompanyFormValues

export {
  createDefaultCompanyFormValues,
  createCompanyId,
  normalizeCompanyLifecycle,
}

export function duplicateCompanyFormValues(
  source: CompanyListItem,
): CreateCompanyFormValues {
  return createDefaultCompanyFormValues({
    name: `${source.name.replace(/ \(copia\)$/i, '')} (copia)`,
    logoUrl: source.logoUrl,
    identifierType: inferCompanyIdentifierType(source.rut),
    rut: source.rut === '—' ? '' : source.rut,
    industry: source.industry,
    city: source.city,
    employees: source.employees === '—' ? '' : source.employees,
    ownerName: source.owner,
    lifecycle: normalizeCompanyLifecycle(source.lifecycle),
    operationalStatus: source.operationalStatus,
  })
}

export function validateCreateCompanyForm(
  values: CreateCompanyFormValues,
): string | null {
  return validateCompanyFormValues(values)
}

export function formValuesToListItem(
  values: CreateCompanyFormValues,
  id = createCompanyId(),
): CompanyListItem {
  return listItemFromCompanyDetail(companyFormValuesToDetail(values, id))
}

export function parseCompaniesCsv(text: string): {
  rows: CreateCompanyFormValues[]
  errors: string[]
  skipped: number
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { rows: [], errors: ['El archivo está vacío.'], skipped: 0 }
  }

  const delimiter = lines[0]!.includes(';') ? ';' : ','
  const headerCells = lines[0]!
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  const headerMap: Record<string, keyof CreateCompanyFormValues> = {
    nombre: 'name',
    name: 'name',
    empresa: 'name',
    rut: 'rut',
    taxid: 'rut',
    dni: 'rut',
    tipoidentificador: 'identifierType',
    identifiertype: 'identifierType',
    tipo_identificador: 'identifierType',
    industria: 'industry',
    industry: 'industry',
    ciudad: 'city',
    city: 'city',
    direccion: 'headquartersStreet',
    address: 'headquartersStreet',
    calle: 'headquartersStreet',
    empleados: 'employees',
    employees: 'employees',
    responsable: 'ownerName',
    owner: 'ownerName',
    etapa: 'lifecycle',
    lifecycle: 'lifecycle',
    estado: 'operationalStatus',
    status: 'operationalStatus',
    operationalstatus: 'operationalStatus',
    web: 'website',
    website: 'website',
    telefono: 'phone',
    teléfono: 'phone',
    phone: 'phone',
    email: 'email',
    correo: 'email',
    descripcion: 'description',
    description: 'description',
    pais: 'headquartersCountry',
    country: 'headquartersCountry',
    region: 'headquartersRegion',
    comuna: 'headquartersCommune',
    commune: 'headquartersCommune',
    codigopostal: 'headquartersPostalCode',
    postalcode: 'headquartersPostalCode',
  }

  const columnMap = headerCells.map((h) => headerMap[h] ?? null)
  const hasHeader = columnMap.some(Boolean)
  const dataLines = hasHeader ? lines.slice(1) : lines

  const rows: CreateCompanyFormValues[] = []
  const errors: string[] = []
  let skipped = 0

  const normalizeOperational = (raw: string): CreateCompanyFormValues['operationalStatus'] =>
    raw.trim().toLowerCase() === 'inactiva' ? 'Inactiva' : 'Activa'

  const normalizeIdentifierType = (raw: string): TaxIdentifierType => {
    const v = raw.trim().toLowerCase()
    if (v === 'dni') return 'DNI'
    return 'RUT'
  }

  dataLines.forEach((line, index) => {
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
    let values = createDefaultCompanyFormValues()

    if (hasHeader) {
      columnMap.forEach((field, colIdx) => {
        if (!field) return
        const cell = cells[colIdx] ?? ''
        if (field === 'lifecycle') values.lifecycle = normalizeCompanyLifecycle(cell)
        else if (field === 'operationalStatus')
          values.operationalStatus = normalizeOperational(cell)
        else if (field === 'identifierType')
          values.identifierType = normalizeIdentifierType(cell)
        else values[field] = cell
      })
    } else {
      values = createDefaultCompanyFormValues({
        name: cells[0] ?? '',
        industry: cells[1] ?? '',
        city: cells[2] ?? '',
        employees: cells[3] ?? '',
        ownerName: cells[4] ?? values.ownerName,
        lifecycle: normalizeCompanyLifecycle(cells[5] ?? 'Prospecto'),
        operationalStatus: normalizeOperational(cells[6] ?? 'Activa'),
      })
    }

    const rowError = validateCreateCompanyForm(values)
    if (rowError) {
      skipped += 1
      errors.push(`Fila ${index + (hasHeader ? 2 : 1)}: ${rowError}`)
      return
    }
    rows.push(values)
  })

  return { rows, errors, skipped }
}
