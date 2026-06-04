export type MentionKind =
  | 'user'
  | 'contact'
  | 'company'
  | 'opportunity'
  | 'quote'
  | 'project'
  | 'product'
  | 'invoice'
  | 'activity'

export type MentionSearchItem = {
  id: string
  kind: MentionKind
  recordId: string
  label: string
  subtitle?: string
  href: string
}
