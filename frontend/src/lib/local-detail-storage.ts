import { isApiEnabled } from '@/api/config'

/**
 * Overrides en localStorage y journeys mock solo aplican sin API.
 * Con API activa, Postgres / registries son la fuente de verdad.
 */
export function isLocalDetailStorageActive(): boolean {
  return !isApiEnabled()
}
