export type ContactDetailTab =
  | 'detalle'
  | 'actividad'
  | 'notas'
  | 'oportunidades'
  | 'archivos'

const CONTACT_DETAIL_TABS: ContactDetailTab[] = [
  'detalle',
  'actividad',
  'notas',
  'oportunidades',
  'archivos',
]

export function isContactDetailTab(value: string): value is ContactDetailTab {
  return (CONTACT_DETAIL_TABS as string[]).includes(value)
}

export function parseContactDetailTab(
  search: string | URLSearchParams,
): ContactDetailTab | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search
  const tab = params.get('tab')
  return tab && isContactDetailTab(tab) ? tab : null
}

export function getContactDetailPath(contactId: string): string {
  return `/contactos/${contactId}`
}

export function detailPathWithTab(
  path: string,
  tab: ContactDetailTab,
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
