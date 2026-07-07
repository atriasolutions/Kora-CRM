import { tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { notFound } from '../middleware/errors.js'
import * as contactsRepo from '../repositories/contacts.repository.js'
import type { ContactPortabilityExport } from '../types/privacy.js'

export async function exportContactPortability(
  contactId: string,
): Promise<ContactPortabilityExport> {
  const contact = await contactsRepo.getContactById(contactId)

  const notes = await tenantQuery(
    `SELECT id, body, created_at, author_name
     FROM crm_entity_notes
     WHERE entity_type = 'contacto' AND entity_id = $1::uuid
     ORDER BY created_at DESC`,
    [contactId],
  )

  const activities = await tenantQuery(
    `SELECT id, title, activity_type, type_label, status, due_at, assignee_name, created_at
     FROM crm_activities
     WHERE related_type = 'contacto' AND related_id = $1::uuid AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 200`,
    [contactId],
  )

  const opportunities = await tenantQuery(
    `SELECT id, code, title, stage, amount_cents, company_name, created_at
     FROM crm_opportunities
     WHERE contact_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 100`,
    [contactId],
  )

  if (!contact) throw notFound('Contacto no encontrado')

  return {
    exportedAt: new Date().toISOString(),
    format: 'json',
    schemaVersion: '1.0',
    dataSubject: {
      contactId: contact.id,
      name: contact.name,
      email: contact.email,
      rut: contact.rut,
    },
    personalData: {
      name: contact.name,
      subtitle: contact.subtitle,
      email: contact.email,
      phone: contact.phone,
      mobilePhone: contact.mobilePhone,
      rut: contact.rut,
      role: contact.role,
      status: contact.status,
      company: contact.company,
      streetAddress: contact.streetAddress,
      region: contact.region,
      commune: contact.commune,
      linkedIn: contact.linkedIn,
      source: contact.source,
      ownerName: contact.ownerName,
      treatmentOpposition: contact.treatmentOpposition ?? false,
      treatmentBlockedAt: contact.treatmentBlockedAt,
      marketingConsent: contact.marketingConsent,
      marketingConsentAt: contact.marketingConsentAt,
      legalBasis: contact.legalBasis,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    },
    relatedRecords: {
      notes: notes.rows,
      activities: activities.rows,
      opportunities: opportunities.rows,
    },
  }
}

export async function executeContactSuppression(
  contactId: string,
): Promise<void> {
  await tenantQuery(
    `UPDATE crm_contacts SET
      treatment_opposition = true,
      marketing_consent = false,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [contactId, getTenantIdOrDefault()],
  )
}

export async function executeContactBlocking(contactId: string): Promise<void> {
  await tenantQuery(
    `UPDATE crm_contacts SET
      treatment_blocked_at = now(),
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [contactId, getTenantIdOrDefault()],
  )
}

export async function executeContactUnblock(contactId: string): Promise<void> {
  await tenantQuery(
    `UPDATE crm_contacts SET
      treatment_blocked_at = NULL,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [contactId, getTenantIdOrDefault()],
  )
}
