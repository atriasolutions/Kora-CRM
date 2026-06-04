import type { CompanyDetail } from '@/data/company-detail.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { activitiesForCompany } from '@/lib/company-activities'
import { contactsForCompany } from '@/lib/company-contacts'
import { opportunitiesForCompany } from '@/lib/company-opportunities'
import { journeyStageToOutcome } from '@/lib/opportunity-journey'
import { formatMoneyCLP, parseMoneyNum } from '@/lib/product-pricing'

export type CompanyDetailMetric = {
  label: string
  value: string
}

export type CompanyDetailMetricsInput = {
  company: Pick<CompanyDetail, 'id' | 'name' | 'lastActivity' | 'activities'>
  opportunities: OpportunityListItem[]
  contacts: ContactListItem[]
  registryActivities?: ActivityListItem[]
}

function mergeCompanyActivities(
  company: CompanyDetailMetricsInput['company'],
  registryActivities: ActivityListItem[],
): ContactActivity[] {
  const companyRow = { id: company.id, name: company.name } as CompanyListItem
  const fromRegistry = activitiesForCompany(registryActivities, companyRow)
  const byId = new Map<string, ContactActivity>()
  for (const activity of [...fromRegistry, ...company.activities]) {
    byId.set(activity.id, activity)
  }
  return [...byId.values()]
}

function countPendingActivities(activities: ContactActivity[]): number {
  return activities.filter(
    (activity) => activity.status === 'Pendiente' || activity.status === 'En curso',
  ).length
}

/** Suma montos de oportunidades abiertas vinculadas a la empresa. */
export function openOpportunityValueForCompany(
  opportunities: OpportunityListItem[],
  company: Pick<CompanyDetail, 'id' | 'name'>,
): string {
  const related = opportunitiesForCompany(opportunities, {
    id: company.id,
    name: company.name,
  })
  const total = related
    .filter((opp) => journeyStageToOutcome(opp.stage) === 'Abierta')
    .reduce((sum, opp) => sum + parseMoneyNum(opp.amount), 0)
  return formatMoneyCLP(total)
}

function formatLastActivityLabel(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '—') return 'Sin registro'
  return trimmed.split('·')[0]?.trim() ?? trimmed
}

/** Métricas de cabecera calculadas desde datos reales del CRM. */
export function buildCompanyDetailMetrics(
  input: CompanyDetailMetricsInput,
): CompanyDetailMetric[] {
  const { company, opportunities, contacts, registryActivities = [] } = input
  const activities = mergeCompanyActivities(company, registryActivities)

  return [
    {
      label: 'Valor en oportunidades',
      value: openOpportunityValueForCompany(opportunities, company),
    },
    {
      label: 'Contactos',
      value: String(
        contactsForCompany(contacts, { id: company.id, name: company.name }).length,
      ),
    },
    {
      label: 'Última actividad',
      value: formatLastActivityLabel(company.lastActivity),
    },
    {
      label: 'Actividades pendientes',
      value: String(countPendingActivities(activities)),
    },
  ]
}
