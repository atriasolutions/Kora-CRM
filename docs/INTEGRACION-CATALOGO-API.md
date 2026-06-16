# Integración de catálogo — Kora CRM

API server-to-server de **solo lectura** para consultar **categorías de productos** y **productos por categoría** de un tenant de Kora CRM.

Pensada para sitios web, ERPs o portales que necesitan mostrar el catálogo comercial sin autenticación de usuario del CRM.

---

## Resumen

| Concepto | Valor |
|----------|--------|
| **Autenticación** | API key (`Bearer` o header `X-API-Key`) — **la misma** que la integración de leads |
| **Formato** | JSON |
| **Métodos** | `GET` (solo lectura) |
| **Base URL producción** | `https://koracrm.cl/api/v1/integrations/catalog` |

| Endpoint | Descripción |
|----------|-------------|
| `GET /catalog/categories` | Lista categorías del tenant |
| `GET /catalog/categories/:categoryId/products` | Lista productos de una categoría |
| `GET /catalog/products/:productId/image` | Imagen del producto (requiere API key) |

La API key está **vinculada a un tenant**. Solo verás categorías y productos de ese cliente, aunque conozcas el `categoryId` de otro tenant.

---

## ¿Es la misma API key que leads?

**Sí.** Usa la misma clave `kora_live_...` generada en `crm_tenant_integration_api_keys`.

| Integración | Endpoint | Método |
|-------------|----------|--------|
| Leads | `/api/v1/integrations/leads` | `POST` |
| Catálogo — categorías | `/api/v1/integrations/catalog/categories` | `GET` |
| Catálogo — productos | `/api/v1/integrations/catalog/categories/:categoryId/products` | `GET` |

No necesitas generar otra key: una key por tenant sirve para **leads** y **catálogo**.

> Si aún no tienes key, sigue la sección [Generar API key](#generar-api-key) (mismo procedimiento que leads).

---

## Instancia de ejemplo: Comercializadora K-S

| Campo | Valor |
|-------|--------|
| **Slug tenant** | `comercializadora-k-s` |
| **Tenant ID** | `d3fea321-d713-4744-ba93-5278648fbcc9` |
| **URL CRM** | `https://comercializadora-k-s.koracrm.cl` |

---

## Autenticación

Cada integración usa una clave con formato:

```text
kora_live_<cadena-secreta>
```

Envíala de **una** de estas formas:

### Opción A — Authorization Bearer (recomendada)

```http
Authorization: Bearer kora_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Opción B — Header dedicado

```http
X-API-Key: kora_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Errores de autenticación

| HTTP | Código | Significado |
|------|--------|-------------|
| 401 | `UNAUTHORIZED` | Falta la key, formato inválido o key inactiva/revocada |

**No** uses cookie de sesión ni JWT de usuario: esta integración es **solo API key**.

---

## Flujo recomendado

```text
1. GET /catalog/categories          → obtienes id + nombre de cada categoría
2. Por cada categoría (o la que necesites):
   GET /catalog/categories/{id}/products  → productos de esa categoría
```

Ejemplo típico en una web:

1. Cargar categorías al iniciar la página (menú o filtros).
2. Al elegir una categoría, pedir sus productos con el `categoryId` devuelto en el paso 1.

---

## 1. Listar categorías

### Request

```http
GET /api/v1/integrations/catalog/categories
Authorization: Bearer TU_API_KEY
```

### Query params (opcionales)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `activeOnly` | `true` \| `false` | `true` | Si `true`, solo categorías activas en el CRM |

### Respuesta exitosa (`200`)

```json
{
  "data": {
    "tenantId": "d3fea321-d713-4744-ba93-5278648fbcc9",
    "tenantSlug": "comercializadora-k-s",
    "categories": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Repuestos",
        "active": true
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "Servicios",
        "active": true
      }
    ]
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `tenantId` | UUID del tenant asociado a la API key |
| `tenantSlug` | Slug del tenant (subdominio) |
| `categories[].id` | UUID de la categoría — úsalo en el endpoint de productos |
| `categories[].name` | Nombre visible en el CRM |
| `categories[].active` | Si la categoría está activa en configuración |

Las categorías vienen ordenadas **alfabéticamente** por nombre.

---

## 2. Listar productos por categoría

### Request

```http
GET /api/v1/integrations/catalog/categories/{categoryId}/products
Authorization: Bearer TU_API_KEY
```

Reemplaza `{categoryId}` por el `id` obtenido del listado de categorías.

### Query params (opcionales)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | entero ≥ 1 | `1` | Página de resultados |
| `pageSize` | entero 1–100 | `50` | Productos por página |
| `status` | `Activo` \| `Agotado` \| `Borrador` | `Activo` | Filtra por estado del producto |
| `q` | string | — | Búsqueda por nombre, SKU o nombre de categoría |

### Respuesta exitosa (`200`)

```json
{
  "data": {
    "tenantId": "d3fea321-d713-4744-ba93-5278648fbcc9",
    "tenantSlug": "comercializadora-k-s",
    "category": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Repuestos",
      "active": true
    },
    "products": [
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "name": "Filtro de aceite",
        "sku": "FLT-001",
        "categoryId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "categoryName": "Repuestos",
        "productType": "Producto",
        "unitOfMeasure": "ud",
        "billingPeriod": "Por unidad",
        "price": "$15.000/ud",
        "priceNum": 15000,
        "priceCurrency": "CLP",
        "status": "Activo",
        "stockNum": 42,
        "imageUrl": "https://koracrm.cl/api/v1/integrations/catalog/products/c3d4e5f6-a7b8-9012-cdef-123456789012/image",
        "barcode": "7801234567890"
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 50,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### Campos del producto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador del producto en Kora |
| `name` | string | Nombre comercial |
| `sku` | string | Código SKU |
| `categoryId` | UUID | Categoría a la que pertenece |
| `categoryName` | string | Nombre de la categoría |
| `productType` | string | Ej. `Producto`, `Servicio` |
| `unitOfMeasure` | string | Unidad de medida (ej. `ud`, `kg`) |
| `billingPeriod` | string? | Periodo de cobro si aplica (ej. `Mensual`, `Por unidad`) |
| `price` | string | Precio formateado para mostrar (incluye sufijo `/ud`, `/mes`, etc.) |
| `priceNum` | number | Monto numérico del precio |
| `priceCurrency` | string | `CLP`, `UF`, `USD` o `EUR` |
| `status` | string | `Activo`, `Agotado` o `Borrador` |
| `stockNum` | number \| null | Stock disponible; `null` si el producto no controla inventario |
| `imageUrl` | string? | URL absoluta para mostrar la imagen (ver sección [Imágenes](#imágenes-de-producto)) |
| `barcode` | string? | Código de barras (si existe) |

---

## Imágenes de producto

Si el producto tiene imagen en Kora CRM, el campo `imageUrl` trae una **URL absoluta** lista para usar.

### Caso A — imagen subida al CRM (almacenada en Kora)

`imageUrl` apunta al endpoint de integración:

```text
https://koracrm.cl/api/v1/integrations/catalog/products/{productId}/image
```

Ese endpoint devuelve el archivo (JPEG, PNG, WebP, etc.) y requiere la misma API key.

**Opción 1 — Header (recomendada en backend / fetch):**

```bash
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/products/PRODUCT_ID/image' \
  -H 'Authorization: Bearer TU_API_KEY' \
  --output producto.jpg
```

**Opción 2 — Query string (útil en `<img>` del navegador):**

```html
<img src="https://koracrm.cl/api/v1/integrations/catalog/products/PRODUCT_ID/image?api_key=TU_API_KEY" alt="Producto" />
```

> Usa la query `api_key` solo si no puedes enviar headers (p. ej. etiqueta `<img>`). Preferible resolver la imagen en tu **backend** y no exponer la key en HTML público.

### Caso B — imagen externa (URL http/https guardada en el producto)

`imageUrl` es esa URL directamente (sin pasar por Kora).

### Sin imagen

Si el producto no tiene foto, el campo `imageUrl` **no aparece** (o es `null` según tu parser JSON).

---

### Qué **no** incluye esta API

Por seguridad y simplicidad, **no** se exponen:

- Precio de costo
- Responsable / owner interno
- Usuarios de creación o edición
- Productos archivados o eliminados

Solo productos **no archivados** (`archived_at IS NULL`).

---

## Errores comunes

| HTTP | Código | Ejemplo |
|------|--------|---------|
| 400 | `BAD_REQUEST` | Parámetros de query inválidos |
| 401 | `UNAUTHORIZED` | API key ausente o incorrecta |
| 404 | `NOT_FOUND` | `categoryId` inexistente o de otro tenant |
| 422 | `VALIDATION_ERROR` | Query string no cumple el esquema |

Formato de error:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Categoría no encontrada"
  }
}
```

---

## Ejemplo cURL — Categorías

```bash
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/categories' \
  -H 'Authorization: Bearer TU_API_KEY'
```

Solo categorías activas (comportamiento por defecto). Para incluir inactivas:

```bash
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/categories?activeOnly=false' \
  -H 'Authorization: Bearer TU_API_KEY'
```

---

## Ejemplo cURL — Productos de una categoría

```bash
CATEGORY_ID='a1b2c3d4-e5f6-7890-abcd-ef1234567890'

curl -sS "https://koracrm.cl/api/v1/integrations/catalog/categories/${CATEGORY_ID}/products?page=1&pageSize=50" \
  -H 'Authorization: Bearer TU_API_KEY'
```

Con búsqueda dentro de la categoría:

```bash
curl -sS "https://koracrm.cl/api/v1/integrations/catalog/categories/${CATEGORY_ID}/products?q=filtro" \
  -H 'Authorization: Bearer TU_API_KEY'
```

---

## Ejemplo Node.js (fetch)

```javascript
const apiKey = process.env.KORA_INTEGRATION_API_KEY
const base = 'https://koracrm.cl/api/v1/integrations/catalog'

const headers = { Authorization: `Bearer ${apiKey}` }

// 1. Categorías
const catRes = await fetch(`${base}/categories`, { headers })
if (!catRes.ok) throw new Error(await catRes.text())
const { data: catalog } = await catRes.json()

console.log('Categorías:', catalog.categories.map((c) => c.name))

// 2. Productos de la primera categoría
const first = catalog.categories[0]
if (!first) process.exit(0)

const prodRes = await fetch(
  `${base}/categories/${first.id}/products?page=1&pageSize=50`,
  { headers },
)
if (!prodRes.ok) throw new Error(await prodRes.text())
const { data: page } = await prodRes.json()

console.log(
  `${page.category.name}: ${page.products.length} productos (total ${page.meta.total})`,
)
```

---

## Ejemplo PHP

```php
<?php
$apiKey = getenv('KORA_INTEGRATION_API_KEY');
$base = 'https://koracrm.cl/api/v1/integrations/catalog';

function koraGet(string $url, string $apiKey): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey],
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status !== 200) {
        throw new RuntimeException("Kora catalog HTTP $status: $body");
    }
    return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
}

$catalog = koraGet("$base/categories", $apiKey);
$categories = $catalog['data']['categories'];

foreach ($categories as $category) {
    $id = $category['id'];
    $page = koraGet("$base/categories/$id/products?pageSize=100", $apiKey);
    $total = $page['data']['meta']['total'];
    echo $category['name'] . ": $total productos\n";
}
```

---

## Paginación

Si una categoría tiene muchos productos, recorre las páginas con `page` y `pageSize`:

```javascript
async function fetchAllProducts(categoryId, apiKey) {
  const items = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `https://koracrm.cl/api/v1/integrations/catalog/categories/${categoryId}/products?page=${page}&pageSize=100`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    )
    const { data } = await res.json()
    items.push(...data.products)
    totalPages = data.meta.totalPages
    page += 1
  }

  return items
}
```

---

## Generar API key

Mismo script y tabla que la integración de leads. En el servidor de producción:

```bash
cd /var/www/kora-crm/backend
npx tsx scripts/create-integration-api-key.ts \
  --tenant-slug comercializadora-k-s \
  --name "Web catálogo + leads" \
  --assignee cris.morenol@duocuc.cl
```

La key se muestra **una sola vez** en consola. Guárdala en el otro sistema como variable de entorno (ej. `KORA_INTEGRATION_API_KEY`).

Documentación relacionada: [INTEGRACION-LEADS-API.md](./INTEGRACION-LEADS-API.md)

---

## Despliegue

Estos endpoints viven en el mismo backend que el CRM. Tras cambios en código:

1. `npm run build` en `backend/`
2. Subir al servidor (`rsync` o tu flujo habitual)
3. `pm2 restart kora-api`

No requiere migración de base de datos adicional: reutiliza `crm_tenant_integration_api_keys`, `crm_product_categories` y `crm_products`.

---

## Checklist de integración

- [ ] Tienes API key `kora_live_...` del tenant correcto
- [ ] `GET /catalog/categories` devuelve las categorías esperadas
- [ ] Con cada `categoryId`, `GET .../products` devuelve productos con `status: Activo`
- [ ] Manejas paginación si hay más de 50 productos por categoría
- [ ] La key está en variable de entorno, no hardcodeada en el frontend público

> **Seguridad:** La API key es un secreto server-to-server. Llama a Kora desde tu **backend** o un BFF; no la expongas en JavaScript del navegador.
