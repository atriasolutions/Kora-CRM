export type CompanyDetailTab =
  | 'detalle'
  | 'actividad'
  | 'ubicacion'
  | 'notas'
  | 'oportunidades'
  | 'contactos'
  | 'archivos'

const COMPANY_DETAIL_TABS: CompanyDetailTab[] = [
  'detalle',
  'actividad',
  'ubicacion',
  'notas',
  'oportunidades',
  'contactos',
  'archivos',
]

export function isCompanyDetailTab(value: string): value is CompanyDetailTab {
  return (COMPANY_DETAIL_TABS as string[]).includes(value)
}

export function parseCompanyDetailTab(
  search: string | URLSearchParams,
): CompanyDetailTab | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search
  const tab = params.get('tab')
  return tab && isCompanyDetailTab(tab) ? tab : null
}

export function getCompanyDetailPath(companyId: string): string {
  return `/empresas/${companyId}`
}

export function companyDetailPathWithTab(
  path: string,
  tab: CompanyDetailTab,
): string {
  const [pathname, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  if (tab === 'detalle') {
    params.delete('tab')
  } else {
    params.set('tab', tab)
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
