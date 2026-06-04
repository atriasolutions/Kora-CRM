/** Solo datos del registry/API; las semillas demo ya no se mezclan. */
export function mergeWithDemoDataset<T>(userItems: readonly T[], _demoItems: readonly T[]): T[] {
  return [...userItems]
}
