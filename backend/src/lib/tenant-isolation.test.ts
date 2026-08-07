import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

describe('tenant isolation — unicidad', () => {
  it('tax-id-uniqueness filtra por tenant_id', () => {
    const content = readFileSync(
      join(process.cwd(), 'src/lib/tax-id-uniqueness.ts'),
      'utf8',
    )
    assert.match(content, /getTenantIdOrDefault/)
    assert.match(content, /AND tenant_id = \$3/)
    assert.equal((content.match(/AND tenant_id = \$3/g) ?? []).length, 2)
  })

  it('contact-uniqueness filtra email por tenant_id', () => {
    const content = readFileSync(
      join(process.cwd(), 'src/lib/contact-uniqueness.ts'),
      'utf8',
    )
    assert.match(content, /getTenantIdOrDefault/)
    assert.match(content, /AND tenant_id = \$3/)
  })

  it('assertSkuAvailable filtra SKU por tenant_id', () => {
    const content = readFileSync(
      join(process.cwd(), 'src/repositories/products.repository.ts'),
      'utf8',
    )
    const fn = content.slice(
      content.indexOf('async function assertSkuAvailable'),
      content.indexOf('function normalizeIntegrationPublishFlags'),
    )
    assert.match(fn, /AND tenant_id = \$2/)
    assert.match(fn, /AND tenant_id = \$3/)
  })
})

describe('tenant isolation — menciones', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/repositories/mentions.repository.ts'),
    'utf8',
  )

  const entityTables = [
    'crm_contacts',
    'crm_companies',
    'crm_opportunities',
    'crm_quotes',
    'crm_projects',
    'crm_products',
    'crm_invoices',
    'crm_activities',
    'crm_solicitudes',
  ]

  for (const table of entityTables) {
    it(`${table} en searchMentions incluye tenant_id`, () => {
      const fromIdx = content.indexOf(`FROM ${table}`)
      assert.ok(fromIdx >= 0, `no se encontró FROM ${table}`)
      const slice = content.slice(fromIdx, fromIdx + 400)
      assert.match(slice, /tenant_id =/)
    })
  }

  it('cada searchKind de entidad pasa tenantId como extraParams', () => {
    const searchKindCalls = content.match(/searchKind\([\s\S]*?\[tenantId\]/g) ?? []
    // users + 9 entidades CRM
    assert.equal(searchKindCalls.length, 10)
  })
})

describe('tenant isolation — boletas', () => {
  it('boletas.repository usa tenantWhereParam en consultas', () => {
    const content = readFileSync(
      join(process.cwd(), 'src/repositories/boletas.repository.ts'),
      'utf8',
    )
    assert.match(content, /tenantWhereParam/)
    assert.match(content, /getTenantIdOrDefault/)
    assert.match(content, /pushTenantCondition/)
  })

  it('listBoletas filtra por tenant_id', () => {
    const content = readFileSync(
      join(process.cwd(), 'src/repositories/boletas.repository.ts'),
      'utf8',
    )
    const listFn = content.slice(
      content.indexOf('export async function listBoletas'),
      content.indexOf('async function loadBoletaHeaderRow'),
    )
    assert.match(listFn, /pushTenantCondition/)
  })
})
