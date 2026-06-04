export type SearchEntityType =
  | 'contact'
  | 'company'
  | 'opportunity'
  | 'quote'
  | 'invoice'
  | 'activity'
  | 'project'
  | 'product'
  | 'purchase'

export type SearchResultItem = {
  type: SearchEntityType
  id: string
  title: string
  subtitle: string
}

export type GlobalSearchResponse = {
  query: string
  results: SearchResultItem[]
}
