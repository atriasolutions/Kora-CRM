export type GlobalSearchEntityType =
  | 'contact'
  | 'company'
  | 'opportunity'
  | 'quote'
  | 'invoice'
  | 'activity'
  | 'project'
  | 'product'
  | 'purchase'

export type GlobalSearchResult = {
  type: GlobalSearchEntityType
  id: string
  title: string
  subtitle: string
}

export type GlobalSearchResponse = {
  query: string
  results: GlobalSearchResult[]
}
