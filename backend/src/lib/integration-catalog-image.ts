import { env } from '../config/env.js'

const INTEGRATION_PRODUCT_IMAGE_PATH =
  '/api/v1/integrations/catalog/products'

/** URL pública para consumir la imagen de un producto vía integración. */
export function integrationCatalogProductImagePath(productId: string): string {
  return `${INTEGRATION_PRODUCT_IMAGE_PATH}/${productId}/image`
}

/**
 * URL que debe usar el sistema externo para mostrar la imagen del producto.
 * - Si ya es http(s), se devuelve tal cual.
 * - Si está almacenada en Kora (data URL), apunta al endpoint de integración.
 */
export function buildIntegrationCatalogProductImageUrl(
  productId: string,
  stored: string | null | undefined,
): string | undefined {
  const trimmed = stored?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `${env.appPublicUrl}${integrationCatalogProductImagePath(productId)}`
}

/**
 * Modo listado:
 * - includeImages=false → URL al endpoint /image (para backends con caché).
 * - includeImages=true  → imagen embebida (data URL) o URL externa en el mismo JSON.
 */
export function resolveIntegrationProductImageForResponse(
  productId: string,
  stored: string | null | undefined,
  includeImages: boolean,
): string | undefined {
  const trimmed = stored?.trim()
  if (!trimmed) return undefined
  if (includeImages) {
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed
    }
    return undefined
  }
  return buildIntegrationCatalogProductImageUrl(productId, trimmed)
}
