import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { runWithTenant } from './tenant-context.js'
import { pushTenantCondition, tenantWhereParam } from './tenant-sql.js'

describe('tenant-sql', () => {
  it('pushTenantCondition añade filtro tenant_id', () => {
    const conditions: string[] = []
    const values: unknown[] = []
    const tenantId = 'a0000001-0001-4001-8001-000000000001'

    runWithTenant({ tenantId }, () => {
      const next = pushTenantCondition(conditions, values, 1)
      assert.equal(next, 2)
      assert.deepEqual(conditions, ['tenant_id = $1'])
      assert.deepEqual(values, [tenantId])
    })
  })

  it('pushTenantCondition respeta alias de tabla', () => {
    const conditions: string[] = []
    const values: unknown[] = []
    runWithTenant({ tenantId: 'tenant-b' }, () => {
      pushTenantCondition(conditions, values, 3, 'c')
      assert.deepEqual(conditions, ['c.tenant_id = $3'])
    })
  })

  it('tenantWhereParam genera placeholder correcto', () => {
    assert.equal(tenantWhereParam(2), 'tenant_id = $2')
    assert.equal(tenantWhereParam(4, 'q'), 'q.tenant_id = $4')
  })
})

describe('repository tenant isolation coverage', () => {
  const repoDir = join(process.cwd(), 'src/repositories')
  const skip = new Set([
    'auth.repository.ts',
    'tenants.repository.ts',
    'two-factor.repository.ts',
    'user-onboarding.repository.ts',
    'user-sessions.repository.ts',
    'geo.repository.ts',
  ])

  it('repositorios de negocio usan tenantQuery o platformQuery explícito', () => {
    const files = readdirSync(repoDir).filter((f) => f.endsWith('.repository.ts'))
    const missing: string[] = []

    for (const file of files) {
      if (skip.has(file)) continue
      const content = readFileSync(join(repoDir, file), 'utf8')
      const isolated =
        content.includes('tenantQuery') ||
        content.includes('platformQuery') ||
        content.includes('getTenantIdOrDefault') ||
        content.includes('requireTenantId')
      if (!isolated) {
        missing.push(file)
      }
    }

    assert.deepEqual(
      missing,
      [],
      `Repositorios sin tenantQuery/platformQuery: ${missing.join(', ')}`,
    )
  })
})
