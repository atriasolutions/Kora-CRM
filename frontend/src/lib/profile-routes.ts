export function getProfilesListPath(): string {
  return '/perfiles'
}

export function getProfileDetailPath(profileId: string): string {
  return `/perfiles/${encodeURIComponent(profileId)}`
}
