# Guía del servicio externo — Integración Kora CRM

Documento para el **equipo que desarrolla el sitio web / ERP / portal** que consume Kora CRM vía API.

Cubre **catálogo** (categorías, productos, imágenes) y **leads**. Una sola API key por tenant.

---

## 1. Qué debe hacer tu servicio (resumen)

```text
┌─────────────────────┐         HTTPS + API key          ┌──────────────────┐
│  Tu sitio / backend │  ──────────────────────────────► │  Kora CRM API    │
│  (servicio nuevo)   │  ◄──────────────────────────────  │  koracrm.cl      │
└─────────────────────┘         JSON / imágenes           └──────────────────┘
```

| # | Responsabilidad de tu servicio | Endpoint Kora |
|---|-------------------------------|---------------|
| 1 | Guardar la API key en variable de entorno (nunca en JS público) | — |
| 2 | Listar categorías del tenant | `GET .../catalog/categories` |
| 3 | Por cada categoría, listar productos | `GET .../catalog/categories/{id}/products` |
| 4 | Mostrar precio, SKU, nombre, imagen | Campos del JSON |
| 5 | Cargar imágenes (con API key en backend o query) | `GET .../catalog/products/{id}/image` |
| 6 | (Opcional) Enviar leads al CRM | `POST .../integrations/leads` |

**Tu servicio NO debe:**
- Conectarse directo a PostgreSQL de Kora
- Usar login de usuario del CRM (JWT/cookies)
- Hardcodear la API key en el frontend público
- Inventar `categoryId`: siempre obtenerlos del paso 2
- Llamar a Kora **por cada usuario** que abre la página (ver [sección 4](#4-caché-imágenes-y-carga-al-destino))

---

## 2. Configuración obligatoria

### Variables de entorno (tu servidor)

```env
KORA_API_BASE=https://koracrm.cl/api/v1
KORA_INTEGRATION_API_KEY=kora_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Instancia de ejemplo: Comercializadora K-S

| Dato | Valor |
|------|--------|
| Tenant slug | `comercializadora-k-s` |
| Tenant ID | `d3fea321-d713-4744-ba93-5278648fbcc9` |
| CRM | `https://comercializadora-k-s.koracrm.cl` |

La API key ya está ligada a ese tenant. No envíes otro `tenantId` esperando ver otro catálogo.

### Autenticación (todas las llamadas)

```http
Authorization: Bearer kora_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

Alternativa:

```http
X-API-Key: kora_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

Solo para **imágenes** en `<img>` (si no puedes usar headers):

```text
.../products/{id}/image?api_key=kora_live_...
```

---

## 3. Flujo de catálogo (paso a paso)

### Paso A — Obtener categorías

```http
GET https://koracrm.cl/api/v1/integrations/catalog/categories
Authorization: Bearer {KORA_INTEGRATION_API_KEY}
```

**Respuesta `200`:**

```json
{
  "data": {
    "tenantId": "d3fea321-d713-4744-ba93-5278648fbcc9",
    "tenantSlug": "comercializadora-k-s",
    "categories": [
      { "id": "7419659f-9bf5-4b50-86e9-3664223f6c7b", "name": "General", "active": true },
      { "id": "fd97346f-2350-4841-b812-24d820aee4ff", "name": "Instrumentación", "active": true }
    ]
  }
}
```

**Tu servicio debe:**
- Guardar `categories[].id` y `categories[].name`
- Usar ese `id` en el paso B (no inventar UUIDs)
- Si la lista viene vacía, mostrar mensaje “sin categorías” (no llamar productos)

Query opcional: `?activeOnly=false` para incluir categorías inactivas (default: solo activas).

---

### Paso B — Obtener productos de una categoría

```http
GET https://koracrm.cl/api/v1/integrations/catalog/categories/{categoryId}/products?page=1&pageSize=50
Authorization: Bearer {KORA_INTEGRATION_API_KEY}
```

Reemplaza `{categoryId}` por el UUID del paso A.

**Respuesta `200` (ejemplo real):**

```json
{
  "data": {
    "tenantSlug": "comercializadora-k-s",
    "category": { "id": "7419659f-...", "name": "General", "active": true },
    "products": [
      {
        "id": "f113af26-6d70-4771-8de1-b89e8f90220c",
        "name": "Manómetro 10 bar 1/2 NPT",
        "sku": "CM0000123",
        "categoryId": "7419659f-9bf5-4b50-86e9-3664223f6c7b",
        "categoryName": "General",
        "productType": "Físico",
        "unitOfMeasure": "unidad",
        "billingPeriod": "Por unidad",
        "price": "$85.000/unidad",
        "priceNum": 85000,
        "priceCurrency": "CLP",
        "status": "Activo",
        "stockNum": null,
        "imageUrl": "https://koracrm.cl/api/v1/integrations/catalog/products/f113af26-.../image"
      }
    ],
    "meta": { "page": 1, "pageSize": 50, "total": 1, "totalPages": 1 }
  }
}
```

**Tu servicio debe:**
- Recorrer **todas las páginas** si `meta.totalPages > 1`
- Mostrar `priceNum` + `priceCurrency` para cálculos; `price` solo para display
- Si `imageUrl` existe, usarla para la foto (ver paso C)
- Si `products` está vacío pero esperabas datos, verificar que el producto en CRM esté en **esa categoría** y con estado **Activo**

Query params:

| Parámetro | Default | Uso |
|-----------|---------|-----|
| `page` | `1` | Paginación |
| `pageSize` | `50` | Máx. 100 |
| `status` | `Activo` | `Activo`, `Agotado`, `Borrador` |
| `q` | — | Buscar por nombre/SKU |

---

### Paso C — Imágenes de producto

| Situación | Qué hace tu servicio |
|-----------|----------------------|
| `imageUrl` es `https://koracrm.cl/.../image` | La imagen está en Kora. Tu **backend** la pide con `Authorization: Bearer` y la sirve al front, o usas `?api_key=` en `<img>` |
| `imageUrl` es otra URL `https://...` | Usar directamente (imagen externa) |
| Sin `imageUrl` | El producto no tiene foto en el CRM |

**Descargar imagen (backend):**

```bash
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/products/PRODUCT_ID/image' \
  -H "Authorization: Bearer ${KORA_INTEGRATION_API_KEY}" \
  --output producto.jpg
```

---

## 4. Modo fácil para cPanel (una sola llamada)

Si tu hosting es **cPanel / PHP / sin Redis**, usa el endpoint **snapshot** con imágenes embebidas:

```http
GET https://koracrm.cl/api/v1/integrations/catalog?includeImages=true
Authorization: Bearer {KORA_INTEGRATION_API_KEY}
```

**Una llamada** devuelve categorías + todos los productos activos + fotos en base64 dentro del JSON (`imageUrl` como `data:image/jpeg;base64,...`).

### Cron en cPanel (cada hora)

Archivo `public_html/cron/sync-catalog.php` (ejecutar con Cron Jobs de cPanel):

```php
<?php
$apiKey = getenv('KORA_INTEGRATION_API_KEY') ?: 'kora_live_...';
$url = 'https://koracrm.cl/api/v1/integrations/catalog?includeImages=true';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey],
]);
$json = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200) {
    error_log("Kora sync falló HTTP $code");
    exit(1);
}

file_put_contents(__DIR__ . '/../data/catalog.json', $json);
echo "OK " . strlen($json) . " bytes\n";
```

Tu página de catálogo solo lee el archivo local:

```php
<?php
$raw = file_get_contents(__DIR__ . '/data/catalog.json');
$payload = json_decode($raw, true);
$catalog = $payload['data'] ?? [];
// $catalog['categories'][0]['products'][0]['imageUrl'] → usar en <img src="...">
```

**Tráfico de visitantes:** 0 llamadas a Kora. Solo el cron (1 vez por hora) pega a Kora.

> **Tamaño:** con muchas fotos el JSON puede pesar varios MB. Ideal para catálogos pequeños/medianos (&lt; 50–100 productos). Sin fotos: `?includeImages=false` (default) y URLs al endpoint `/image`.

---

## 5. Caché, imágenes y carga al destino (hosting con backend)

### ¿100 productos = 100 llamadas a Kora por cada visita?

**No debería.** Separa dos cosas:

| Qué cargas | Llamadas a Kora (bien hecho) | Mal hecho |
|------------|-------------------------------|-----------|
| **Lista de productos** (nombre, precio, SKU) | **1–N** (1 por categoría + paginación). Ej. 100 productos en 1 categoría = **1 request** con `pageSize=100` | 100 requests |
| **Imágenes** | **0 por visita** si usas caché/CDN propio (ver abajo) | 100 requests a Kora en cada refresh |

La API de Kora devuelve el catálogo en JSON en **pocas llamadas**. Las imágenes van en URLs separadas porque son archivos binarios, no porque debas pedirlas en cada page view.

### Arquitectura recomendada (producción)

```text
Usuario → Tu web (frontend)
              ↓
         Tu backend / BFF  ←── caché (Redis, memoria, archivo)
              ↓
         Kora API (solo cuando expira el caché o sync programado)
```

**Opción A — Caché de catálogo en tu backend (la más simple)**

1. Tu backend expone `GET /api/tienda/catalogo` (sin API key hacia el navegador).
2. Ese endpoint consulta Kora **cada 15–60 minutos** (o al expirar TTL), no en cada usuario.
3. Guardas JSON en Redis/memoria y se lo sirves a todos los visitantes.
4. Para imágenes: tu backend descarga de Kora **una vez** por producto (o cuando cambia el catálogo) y las sirve desde tu dominio o las reenvía con caché.

**Opción B — Sincronización programada (catálogo + fotos)**

1. Cron cada X horas: categorías + productos → tu base de datos.
2. Por cada `imageUrl` de Kora, descargas la imagen a tu storage (S3, disco, CDN).
3. En tu web, `imageUrl` apunta a `https://tutienda.cl/media/productos/{sku}.jpg`.
4. Kora solo se usa en el sync, **nunca** en el tráfico de usuarios.

**Opción C — Proxy de imágenes con caché HTTP**

1. Tu backend: `GET /media/producto/:id` → si no está en caché, pide a Kora con Bearer → guarda 7 días → responde al navegador.
2. El navegador también cachea (ver abajo).
3. Refresh del usuario **no** vuelve a Kora si la imagen ya está en caché del proxy o del browser.

### Caché del navegador (imágenes desde Kora)

Si sirves la imagen con URL estable (misma por producto), Kora responde con:

```http
Cache-Control: private, max-age=604800
```

(7 días). El **refresh** de la página no obliga a 100 nuevas descargas desde Kora si el navegador ya tiene las imágenes. Igual conviene **no** depender solo de eso: usa tu backend o CDN.

### Cuántas llamadas reales al sincronizar (ejemplo 100 productos, 2 categorías)

```text
GET /catalog/categories                    → 1
GET /catalog/categories/{id}/products      → 2  (o 1 si todo está en una categoría con pageSize=100)
GET .../products/{id}/image                → hasta 100 (solo en sync inicial o cuando cambia una foto)
```

Eso es **una vez por sync**, no por cada usuario.

### Qué exponer al frontend público

| Dato | Origen |
|------|--------|
| Catálogo JSON | Tu API (`/api/tienda/...`) |
| URLs de imagen | Tu CDN / tu proxy (`https://tutienda.cl/...`) |
| API key Kora | **Solo** en tu servidor (env) |

### Resumen

- **Lista de productos:** pocas llamadas a Kora; pagina con `pageSize=100`.
- **Imágenes:** no las pidas a Kora en cada visita; cachea o sincroniza en tu destino.
- **Refresh del usuario:** debe pegarle a **tu** servicio, que ya tiene datos frescos en caché.

---

## 6. Flujo completo recomendado (pseudocódigo)

```javascript
const BASE = process.env.KORA_API_BASE
const KEY = process.env.KORA_INTEGRATION_API_KEY
const headers = { Authorization: `Bearer ${KEY}` }

// 1. Categorías
const catRes = await fetch(`${BASE}/integrations/catalog/categories`, { headers })
if (!catRes.ok) throw new Error(`Kora categorías: ${catRes.status} ${await catRes.text()}`)
const { data: catalog } = await catRes.json()

// 2. Productos por categoría
const catalogByCategory = []
for (const category of catalog.categories) {
  const products = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const url = `${BASE}/integrations/catalog/categories/${category.id}/products?page=${page}&pageSize=100`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Kora productos: ${res.status} ${await res.text()}`)
    const { data } = await res.json()
    products.push(...data.products)
    totalPages = data.meta.totalPages
    page += 1
  }
  catalogByCategory.push({ category, products })
}

// 3. Exponer a tu frontend (sin la API key)
return catalogByCategory
```

---

## 7. Errores que debes manejar

| HTTP | Código | Qué hacer tu servicio |
|------|--------|----------------------|
| `401` | `UNAUTHORIZED` | API key ausente, inválida o revocada → revisar env |
| `404` | `NOT_FOUND` | `categoryId` incorrecto o de otro tenant → volver al paso A |
| `400` | `BAD_REQUEST` | Query params mal formados |
| `422` | `VALIDATION_ERROR` | JSON/query inválido |
| `500` | `INTERNAL_ERROR` | Fallo en Kora → reintentar con backoff; avisar soporte |

Formato de error:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Categoría no encontrada"
  }
}
```

**Siempre validar `response.ok` antes de parsear JSON.**

---

## 8. Leads (opcional)

Misma API key. Documentación detallada: [INTEGRACION-LEADS-API.md](./INTEGRACION-LEADS-API.md)

```http
POST https://koracrm.cl/api/v1/integrations/leads
Authorization: Bearer {KORA_INTEGRATION_API_KEY}
Content-Type: application/json
```

Crea empresa + contacto + oportunidad en el tenant de la key.

---

## 9. cURL de prueba (copiar y pegar)

Sustituye `TU_API_KEY`.

```bash
export KORA_API_KEY='kora_live_...'

# Health (sin auth)
curl -sS 'https://koracrm.cl/health'

# Catálogo completo (cPanel — una llamada, con imágenes)
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog?includeImages=true' \
  -H "Authorization: Bearer ${KORA_API_KEY}" -o catalog.json

# 1. Categorías (modo por pasos)
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/categories' \
  -H "Authorization: Bearer ${KORA_API_KEY}" | python3 -m json.tool

# 2. Productos — categoría General (ejemplo ID prod)
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/categories/7419659f-9bf5-4b50-86e9-3664223f6c7b/products' \
  -H "Authorization: Bearer ${KORA_API_KEY}" | python3 -m json.tool

# 3. Imagen (si el producto tiene imageUrl)
curl -sS 'https://koracrm.cl/api/v1/integrations/catalog/products/f113af26-6d70-4771-8de1-b89e8f90220c/image' \
  -H "Authorization: Bearer ${KORA_API_KEY}" \
  --output manometro.jpg
```

> Los UUID de categoría/producto pueden cambiar. **Siempre** parte del paso 1 (categorías) para obtener IDs actuales.

---

## 10. Checklist antes de ir a producción

- [ ] `KORA_INTEGRATION_API_KEY` en variables de entorno del **servidor** (no en el navegador)
- [ ] `GET /catalog/categories` responde `200` con categorías esperadas
- [ ] Por cada `category.id`, `GET .../products` responde `200`
- [ ] Paginación implementada (`meta.totalPages`)
- [ ] Manejo de errores `401`, `404`, `500`
- [ ] Catálogo cacheado en tu backend (no 1 llamada a Kora por usuario)
- [ ] Imágenes en CDN/proxy propio o caché (no 100 hits a Kora por page view)
- [ ] Productos en CRM con estado **Activo** y categoría correcta del **mismo tenant**
- [ ] Health check: `GET https://koracrm.cl/health` → `{"status":"ok","database":"connected"}`

---

## 11. Problemas frecuentes

### “Productos vacíos pero hay productos en el CRM”

1. El producto debe estar en la **misma categoría** que consultas (UUID del paso A).
2. Por defecto solo devuelve `status=Activo`. Prueba `?status=Borrador` para depurar.
3. El producto no debe estar **archivado** en Kora.

### “No viene imageUrl”

El producto no tiene imagen cargada en el CRM. Sube la foto en la ficha del producto.

### “500 Internal Error”

1. Verifica `GET /health`.
2. Confirma header `Authorization: Bearer ...` (sin espacios extra).
3. Reintenta; si persiste, contacta al administrador de Kora.

### “401 Unauthorized”

API key incorrecta, revocada o mal copiada. Regenerar en servidor Kora si es necesario.

---

## 12. Referencias

| Documento | Contenido |
|-----------|-----------|
| [INTEGRACION-CATALOGO-API.md](./INTEGRACION-CATALOGO-API.md) | Referencia técnica catálogo |
| [INTEGRACION-LEADS-API.md](./INTEGRACION-LEADS-API.md) | Referencia técnica leads + región/comuna |

---

## 13. Contacto / soporte

Ante fallos persistentes, reportar:

1. Hora del error (UTC o Chile)
2. Endpoint llamado (URL completa sin la API key)
3. HTTP status y body de `error`
4. Resultado de `GET https://koracrm.cl/health`
