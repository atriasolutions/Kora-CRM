# Integración de leads externos — Kora CRM

API server-to-server para crear **empresa + contacto + oportunidad** en un tenant de Kora CRM, con los mismos datos que el formulario **Prueba gratis** de la landing.

---

## Resumen

| Concepto | Valor |
|----------|--------|
| **Método** | `POST` |
| **URL producción** | `https://koracrm.cl/api/v1/integrations/leads` |
| **Autenticación** | API key (`Bearer` o header `X-API-Key`) |
| **Formato** | JSON (`Content-Type: application/json`) |
| **Respuesta exitosa** | `201 Created` |

La API key está **vinculada a un tenant**. No puedes insertar leads en otra instancia aunque envíes otro `tenantId`.

---

## Instancia de ejemplo: Comercializadora K-S

| Campo | Valor |
|-------|--------|
| **Slug tenant** | `comercializadora-k-s` |
| **URL CRM** | `https://comercializadora-k-s.koracrm.cl` |
| **Responsable por defecto** | `cris.morenol@duocuc.cl` |
| **Fallback si inactivo** | Primer **administrador activo** del tenant |

> La API key concreta se genera una sola vez en el servidor (ver sección [Generar API key](#generar-api-key)).

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

## Cuerpo de la solicitud (JSON)

### Campos del lead (igual que Prueba gratis)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | Sí | Nombre del contacto |
| `company` | string | Sí | Nombre de la empresa |
| `identifierType` | `"RUT"` \| `"DNI"` | No | Tipo de identificador fiscal. Si se omite, se infiere del valor de `rut` |
| `rut` | string | Sí | RUT de la empresa o DNI (según `identifierType`) |
| `employees` | string | Sí | Cantidad de empleados (texto libre, ej. `"25"`, `"11-50"`) |
| `address` | string | Sí | Dirección (calle/número) |
| `region` | string | Sí | Región de Chile (catálogo geo del CRM) |
| `commune` | string | Sí | Comuna (debe corresponder a la región) |
| `email` | string | Sí | Correo del contacto |
| `phone` | string | Sí | Teléfono chileno válido (móvil 9 dígitos o fijo) |
| `message` | string | No | Comentario / notas adicionales |

### Campos de integración

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `tenantId` | UUID | No | UUID del tenant. Debe coincidir con el de la API key |
| `tenantSlug` | string | No | Slug del tenant (ej. `comercializadora-k-s`). Debe coincidir con la API key |
| `assigneeEmail` | string | No | Correo del usuario responsable en ese tenant. Si está inactivo o no existe → **administrador activo** |
| `externalId` | string | No | ID de referencia de tu sistema (aparece en notas internas) |

Si omites `tenantId` y `tenantSlug`, se usa el tenant de la API key.

---

## Qué crea el endpoint

Por cada lead válido:

1. **Empresa** (Prospecto) — se crea solo si no existe por RUT/DNI o nombre; si ya existe, no se modifica.  
2. **Contacto** (Prospecto) — se crea solo si no existe por email; si ya existe, no se modifica.  
3. **Oportunidad** — **siempre** se crea una nueva, etapa **Calificados**, tipo **Nuevo negocio**, asignada al responsable resuelto.  

El responsable recibe **notificación** de la oportunidad nueva en Kora CRM.

---

## Respuesta exitosa (`201`)

```json
{
  "data": {
    "tenantId": "uuid-del-tenant",
    "tenantSlug": "comercializadora-k-s",
    "companyId": "uuid-empresa",
    "contactId": "uuid-contacto",
    "opportunityId": "uuid-oportunidad",
    "createdCompany": true,
    "createdContact": true,
    "createdOpportunity": true,
    "assignedOwner": {
      "userId": "uuid-usuario",
      "userName": "Nombre Apellido"
    },
    "assigneeEmailRequested": "cris.morenol@duocuc.cl",
    "assigneeEmailUsed": "cris.morenol@duocuc.cl",
    "usedAdminFallback": false
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `createdCompany` / `createdContact` | `false` si se reutilizó registro existente |
| `assigneeEmailRequested` | Email pedido en el body o default de la API key |
| `assigneeEmailUsed` | Email del usuario que quedó como responsable |
| `usedAdminFallback` | `true` si el assignee pedido no estaba activo y se usó un administrador |

---

## Errores comunes

| HTTP | Código | Ejemplo |
|------|--------|---------|
| 400 | `BAD_REQUEST` | Región/comuna inválida, RUT mal formado, `tenantSlug` no coincide con la key |
| 401 | `UNAUTHORIZED` | API key ausente o incorrecta |
| 409 | `CONFLICT` | Duplicado de datos (poco frecuente; el servicio intenta reutilizar registros) |
| 422 | `VALIDATION_ERROR` | JSON no cumple el esquema (Zod) |

Formato de error:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Descripción del problema"
  }
}
```

---

## Ejemplo cURL — Comercializadora K-S

Reemplaza `TU_API_KEY` por la clave generada en el servidor.

```bash
curl -sS -X POST 'https://koracrm.cl/api/v1/integrations/leads' \
  -H 'Authorization: Bearer TU_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantSlug": "comercializadora-k-s",
    "assigneeEmail": "cris.morenol@duocuc.cl",
    "name": "Juan Pérez",
    "company": "Empresa Demo SpA",
    "identifierType": "RUT",
    "rut": "76.123.456-7",
    "employees": "11-50",
    "address": "Av. Providencia 1234",
    "region": "Metropolitana de Santiago",
    "commune": "Providencia",
    "email": "juan.perez@empresademo.cl",
    "phone": "+56 9 8765 4321",
    "message": "Lead desde sistema ERP",
    "externalId": "ERP-2026-001"
  }'
```

---

## Ejemplo PHP

```php
<?php
$apiKey = getenv('KORA_INTEGRATION_API_KEY');
$url = 'https://koracrm.cl/api/v1/integrations/leads';

$payload = [
    'tenantSlug' => 'comercializadora-k-s',
    'assigneeEmail' => 'cris.morenol@duocuc.cl',
    'name' => 'Juan Pérez',
    'company' => 'Empresa Demo SpA',
    'identifierType' => 'RUT',
    'rut' => '76.123.456-7',
    'employees' => '11-50',
    'address' => 'Av. Providencia 1234',
    'region' => 'Metropolitana de Santiago',
    'commune' => 'Providencia',
    'email' => 'juan.perez@empresademo.cl',
    'phone' => '+56987654321',
    'message' => 'Lead desde ERP',
    'externalId' => 'ERP-2026-001',
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status !== 201) {
    throw new RuntimeException("Kora lead error HTTP $status: $response");
}

$data = json_decode($response, true);
echo 'Oportunidad creada: ' . $data['data']['opportunityId'];
```

---

## Ejemplo Node.js (fetch)

```javascript
const apiKey = process.env.KORA_INTEGRATION_API_KEY

const res = await fetch('https://koracrm.cl/api/v1/integrations/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    tenantSlug: 'comercializadora-k-s',
    assigneeEmail: 'cris.morenol@duocuc.cl',
    name: 'Juan Pérez',
    company: 'Empresa Demo SpA',
    identifierType: 'RUT',
    rut: '76.123.456-7',
    employees: '11-50',
    address: 'Av. Providencia 1234',
    region: 'Metropolitana de Santiago',
    commune: 'Providencia',
    email: 'juan.perez@empresademo.cl',
    phone: '+56 9 8765 4321',
    message: 'Lead desde webhook',
    externalId: 'WH-99',
  }),
})

if (!res.ok) {
  const err = await res.json()
  throw new Error(err.error?.message ?? res.statusText)
}

const { data } = await res.json()
console.log('Oportunidad:', data.opportunityId)
```

---

## Reglas de negocio

### Asignación del responsable

1. Se usa `assigneeEmail` del body, o el **default** configurado en la API key.  
2. El usuario debe estar **Activo** y con membresía **active** en el tenant.  
3. Si no califica → se asigna al **primer administrador activo** (`system_key = admin`).  
4. La respuesta indica si hubo fallback (`usedAdminFallback: true`).

### Duplicados

- Misma empresa por **RUT/DNI** o nombre → se **reutiliza** sin modificarla (no cambia responsable ni datos).  
- Mismo **email** de contacto → se **reutiliza** sin modificarlo.  
- En ambos casos **solo se crea una nueva oportunidad** vinculada a los registros existentes.  
- La notificación al responsable corresponde a la **oportunidad nueva** (no al contacto/empresa ya existentes).

### Teléfono

Debe ser un número chileno válido (misma regla que Prueba gratis):

- Móvil: 9 dígitos comenzando en `9`  
- Fijo: 9 dígitos con código de área  

Ejemplos válidos: `+56 9 8765 4321`, `987654321`, `+56223456789`

### Región y comuna

Los campos `region` y `commune` son **picklists dependientes**: la comuna debe pertenecer a la región indicada. Los nombres deben coincidir **exactamente** con el catálogo (tildes, `Ñ`, apóstrofes).

También puedes obtener el catálogo actualizado en JSON:

```http
GET https://koracrm.cl/api/v1/geo/chile
```

Si la combinación no existe, la API responde `400`.

---

## Catálogo completo región / comuna (Chile)

**16 regiones** · **346 comunas** válidas. Usa estos textos literales en `region` y `commune`.

### Arica y Parinacota

| Comuna |
|--------|
| Arica |
| Camarones |
| General Lagos |
| Putre |

### Tarapacá

| Comuna |
|--------|
| Alto Hospicio |
| Camiña |
| Colchane |
| Huara |
| Iquique |
| Pica |
| Pozo Almonte |

### Antofagasta

| Comuna |
|--------|
| Antofagasta |
| Calama |
| María Elena |
| Mejillones |
| Ollagüe |
| San Pedro de Atacama |
| Sierra Gorda |
| Taltal |
| Tocopilla |

### Atacama

| Comuna |
|--------|
| Alto del Carmen |
| Caldera |
| Chañaral |
| Copiapó |
| Diego de Almagro |
| Freirina |
| Huasco |
| Tierra Amarilla |
| Vallenar |

### Coquimbo

| Comuna |
|--------|
| Andacollo |
| Canela |
| Combarbalá |
| Coquimbo |
| Illapel |
| La Higuera |
| La Serena |
| Los Vilos |
| Monte Patria |
| Ovalle |
| Paiguano |
| Punitaqui |
| Río Hurtado |
| Salamanca |
| Vicuña |

### Valparaíso

| Comuna |
|--------|
| Algarrobo |
| Cabildo |
| Calle Larga |
| Cartagena |
| Casablanca |
| Catemu |
| Concón |
| El Quisco |
| El Tabo |
| Hijuelas |
| Isla de Pascua |
| Juan Fernández |
| La Calera |
| La Cruz |
| La Ligua |
| Limache |
| Llaillay |
| Los Andes |
| Nogales |
| Olmué |
| Panquehue |
| Papudo |
| Petorca |
| Puchuncaví |
| Putaendo |
| Quillota |
| Quilpué |
| Quintero |
| Riconada |
| San Antonio |
| San Esteban |
| San Felipe |
| Santa María |
| Santo Domingo |
| Valparaíso |
| Villa Alemana |
| Viña del Mar |
| Zapallar |

### Metropolitana de Santiago

| Comuna |
|--------|
| Alhué |
| Buin |
| Calera de Tango |
| Cerrillos |
| Cerro Navia |
| Colina |
| Conchalí |
| Curacaví |
| El Bosque |
| El Monte |
| Estación Central |
| Huechuraba |
| Independencia |
| Isla de Maipo |
| La Cisterna |
| La Florida |
| La Granja |
| La Pintana |
| La Reina |
| Lampa |
| Las Condes |
| Lo Barnechea |
| Lo Espejo |
| Lo Prado |
| Macul |
| Maipú |
| María Pinto |
| Melipilla |
| Ñuñoa |
| Padre Hurtado |
| Paine |
| Pedro Aguirre Cerda |
| Peñaflor |
| Peñalolén |
| Pirque |
| Providencia |
| Pudahuel |
| Puente Alto |
| Quilicura |
| Quinta Normal |
| Recoleta |
| Renca |
| San Bernardo |
| San Joaquín |
| San José de Maipo |
| San Miguel |
| San Pedro |
| San Ramón |
| Santiago |
| Talagante |
| Tiltil |
| Vitacura |

### O'Higgins

| Comuna |
|--------|
| Chépica |
| Chimbarongo |
| Codegua |
| Coinco |
| Coltauco |
| Doñihue |
| Graneros |
| La Estrella |
| Las Cabras |
| Litueche |
| Lolol |
| Machalí |
| Malloa |
| Marichihue |
| Mostazal |
| Nancagua |
| Navidad |
| Olivar |
| Palmilla |
| Paredones |
| Peralillo |
| Peumo |
| Pichidegua |
| Pichilemu |
| Placilla |
| Pumanque |
| Quinta de Tilcoco |
| Rancagua |
| Rengo |
| Requínoa |
| San Fernando |
| San Vicente |
| Santa Cruz |

### Maule

| Comuna |
|--------|
| Cauquenes |
| Chanco |
| Colbún |
| Constitución |
| Curepto |
| Curicó |
| Empedrado |
| Hualañé |
| Licantén |
| Linares |
| Longaví |
| Maule |
| Molina |
| Parral |
| Pelarco |
| Pelluhue |
| Pencahue |
| Rauco |
| Retiro |
| Río Claro |
| Romeral |
| Sagrada Familia |
| San Clemente |
| San Javier |
| San Rafael |
| Talca |
| Teno |
| Vichuquén |
| Villa Alegre |
| Yerbas Buenas |

### Ñuble

| Comuna |
|--------|
| Bulnes |
| Chillán |
| Chillán Viejo |
| Cobquecura |
| Coelemu |
| Coihueco |
| El Carmen |
| Ninhue |
| Ñiquén |
| Pemuco |
| Pinto |
| Portezuelo |
| Quillón |
| Quirihue |
| Ránqui |
| San Carlos |
| San Fabián |
| San Ignacio |
| San Nico |
| Treguaco |
| Yungay |

### Biobío

| Comuna |
|--------|
| Alto Biobío |
| Antuco |
| Arauco |
| Cabrero |
| Cañete |
| Chiguayante |
| Concepción |
| Contulmo |
| Coronel |
| Curanilahue |
| Florida |
| Hualpén |
| Hualqui |
| Laja |
| Lebu |
| Los Álamos |
| Los Ángeles |
| Lota |
| Mulchén |
| Nacimiento |
| Negrete |
| Penco |
| Quilaco |
| Quilleco |
| San Pedro de la Paz |
| San Rosendo |
| Santa Bárbara |
| Santa Juana |
| Talcahuano |
| Tirúa |
| Tomé |
| Tucapel |
| Yumbel |

### La Araucanía

| Comuna |
|--------|
| Angol |
| Carahue |
| Cholchol |
| Collipulli |
| Cunco |
| Curacautín |
| Curarrehue |
| Ercilla |
| Freire |
| Galvarino |
| Gorbea |
| Lautaro |
| Loncoche |
| Lonquimay |
| Los Sauces |
| Lumaco |
| Melipeuco |
| Nueva Imperial |
| Padre Las Casas |
| Perquenco |
| Pitrufquén |
| Pucón |
| Purén |
| Renaico |
| Saavedra |
| Temuco |
| Teodoro Schmidt |
| Toltén |
| Traiguén |
| Victoria |
| Vilcún |
| Villarrica |

### Los Ríos

| Comuna |
|--------|
| Corral |
| Futrono |
| La Unión |
| Lago Ranco |
| Lanco |
| Los Lagos |
| Máfil |
| Mariquina |
| Paillaco |
| Panguipulli |
| Río Bueno |
| Valdivia |

### Los Lagos

| Comuna |
|--------|
| Ancud |
| Calbuco |
| Castro |
| Chaitén |
| Chonchi |
| Cochamó |
| Curaco de Vélez |
| Dalcahue |
| Fresia |
| Frutillar |
| Futaleufú |
| Hualaihué |
| Llanquihue |
| Los Muermos |
| Maullín |
| Osorno |
| Palena |
| Puerto Montt |
| Puerto Octay |
| Puerto Varas |
| Puqueldón |
| Purranque |
| Puyehue |
| Queilén |
| Quellón |
| Quemchi |
| Quinchao |
| Río Negro |
| San Juan de la Costa |
| San Pablo |

### Aysén

| Comuna |
|--------|
| Aysén |
| Chile Chico |
| Cisnes |
| Cochrane |
| Coyhaique |
| Guaitecas |
| Lago Verde |
| O'Higgins |
| Río Ibáñez |
| Tortel |

### Magallanes

| Comuna |
|--------|
| Antártica |
| Cabo de Hornos |
| Laguna Blanca |
| Natales |
| Porvenir |
| Primavera |
| Punta Arenas |
| Río Verde |
| San Gregorio |
| Timaukel |
| Torres del Paine |

### Ejemplo de combinación válida

```json
{
  "region": "Metropolitana de Santiago",
  "commune": "Providencia"
}
```

---

## Generar API key

En el servidor de producción (requiere migración `20260628_tenant_integration_api_keys.sql` aplicada):

```bash
cd /var/www/kora-crm/backend

# Aplicar migración (una vez)
psql "$DATABASE_URL" -f ../database/postgres/migrations/20260628_tenant_integration_api_keys.sql

# Crear key para Comercializadora K-S con assignee por defecto
npx tsx scripts/create-integration-api-key.ts \
  comercializadora-k-s \
  cris.morenol@duocuc.cl \
  "ERP Comercializadora"
```

El script imprime la clave **una sola vez**. Guárdala en el sistema origen (variable de entorno, secret manager, etc.).

Para **revocar** una key:

```sql
UPDATE crm_tenant_integration_api_keys
SET active = false
WHERE tenant_id = (SELECT id FROM crm_tenants WHERE slug = 'comercializadora-k-s');
```

---

## Seguridad recomendada

- Usa **HTTPS** siempre.  
- No expongas la API key en el frontend ni en repos públicos.  
- Rota la key si se filtra (`active = false` + generar una nueva).  
- Opcional: restringe en firewall del sistema origen las IPs que pueden llamar a Kora.  
- Registra `externalId` para trazabilidad con tu ERP/landing.

---

## Despliegue backend

Tras actualizar código:

```bash
cd /var/www/kora-crm/backend
npm run build
pm2 restart kora-api
```

No requiere cambios en el frontend.

---

## Soporte

Ante errores de validación de región/comuna o assignee, verifica en Kora CRM:

1. Que el tenant `comercializadora-k-s` exista y esté activo.  
2. Que `cris.morenol@duocuc.cl` tenga usuario **Activo** con membresía en ese tenant (o un admin activo como fallback).  
3. Que la migración de API keys esté aplicada.
