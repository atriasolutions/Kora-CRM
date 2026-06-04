import { getEmailHref } from '@/lib/email'

/** Etiqueta corta para tarjetas (Kanban, segmentos). */
export function companyEmployeesSnippet(employees: string): string | null {
  const value = employees.trim()
  if (!value || value === '—') return null
  return `${value} empleados`
}

/** Etiqueta para filas de detalle. */
export function formatCompanyEmployeesLabel(employees: string): string {
  const value = employees.trim()
  if (!value || value === '—') return 'Sin dato'
  return `${value} empleados`
}

export function companyWebsiteHref(website: string): string | undefined {
  const value = website.trim()
  if (!value || value === '—') return undefined
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

export function companyEmailHref(email: string): string | undefined {
  return getEmailHref(email) ?? undefined
}
