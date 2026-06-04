/** Nombre de responsable/propietario para API y estado local. */
export function resolveRecordOwnerName(source: {
  owner?: string | { name?: string }
  ownerName?: string
  ownerDetail?: { name?: string }
}): string {
  if (typeof source.owner === 'string') {
    const s = source.owner.trim()
    if (s) return s
  }
  if (source.owner && typeof source.owner === 'object' && 'name' in source.owner) {
    const n = source.owner.name?.trim()
    if (n) return n
  }
  if (source.ownerDetail?.name?.trim()) return source.ownerDetail.name.trim()
  if (source.ownerName?.trim()) return source.ownerName.trim()
  return ''
}
