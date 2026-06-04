import { pool } from '../db/pool.js'
import { getCompanyLinkById } from '../repositories/companies.repository.js'
import { badRequest } from '../middleware/errors.js'

export async function getContactLinkById(
  id: string,
): Promise<{ id: string; name: string; company_id: string | null; company_name: string } | null> {
  const result = await pool.query<{
    id: string
    name: string
    company_id: string | null
    company_name: string
  }>(
    `SELECT id, name, company_id, company_name FROM crm_contacts WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

export async function getOpportunityLinkById(
  id: string,
): Promise<{ id: string; name: string; company_id: string | null; company_name: string; contact_id: string | null; contact_name: string } | null> {
  const result = await pool.query<{
    id: string
    name: string
    company_id: string | null
    company_name: string
    contact_id: string | null
    contact_name: string
  }>(
    `SELECT id, name, company_id, company_name, contact_id, contact_name
     FROM crm_opportunities WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

export type CustomerSnapshots = {
  companyId: string | null
  companyName: string
  contactId: string | null
  contactName: string
}

export async function resolveCustomerSnapshots(input: {
  companyId?: string | null
  companyName?: string
  contactId?: string | null
  contactName?: string
}): Promise<CustomerSnapshots> {
  let companyId = input.companyId ?? null
  let companyName = input.companyName?.trim() ?? ''
  let contactId = input.contactId ?? null
  let contactName = input.contactName?.trim() ?? ''

  if (contactId) {
    const contact = await getContactLinkById(contactId)
    if (!contact) throw badRequest('Contacto no encontrado')
    contactId = contact.id
    contactName = contact.name
    if (!companyId && contact.company_id) {
      companyId = contact.company_id
      companyName = contact.company_name
    }
  }

  if (companyId) {
    const company = await getCompanyLinkById(companyId)
    if (!company) throw badRequest('Empresa no encontrada')
    companyId = company.id
    companyName = company.name
  }

  return { companyId, companyName, contactId, contactName }
}

export async function resolveOpportunitySnapshot(
  opportunityId: string | null | undefined,
): Promise<{ opportunityId: string | null; opportunityName: string }> {
  if (!opportunityId) return { opportunityId: null, opportunityName: '' }
  const opp = await getOpportunityLinkById(opportunityId)
  if (!opp) throw badRequest('Oportunidad no encontrada')
  return { opportunityId: opp.id, opportunityName: opp.name }
}
