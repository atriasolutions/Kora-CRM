# Despliegue multi-tenant — Kora CRM

## 1. Respaldo obligatorio

```bash
pg_dump -Fc -d kora_crm -f kora_crm_pre_multitenant.dump
```

## 2. Migraciones SQL (en orden)

```bash
psql -d kora_crm -f database/postgres/migrations/20260612_multi_tenant_platform.sql
psql -d kora_crm -f database/postgres/migrations/20260613_multi_tenant_rls.sql
```

## 3. DNS (nic.cl / DigitalOcean)

| Registro | Valor |
|----------|--------|
| `A` apex `koracrm.cl` | `157.230.135.49` |
| `A` `www` | `157.230.135.49` |
| `A` wildcard `*` | `157.230.135.49` |

Primer tenant app: **`atriasolutions.koracrm.cl`**

## 4. SSL wildcard (obligatorio antes de demos automáticas)

Nginx ya escucha `*.koracrm.cl`, pero **Let's Encrypt debe emitir un certificado wildcard**.
Sin esto, cada subdominio nuevo (`estafa.koracrm.cl`, etc.) mostrará `NET::ERR_CERT_COMMON_NAME_INVALID`.

Con el registro DNS `*` ya creado, emite **un certificado wildcard** para todos los subdominios futuros:

```bash
# En el servidor, una sola vez (token DO con permiso DNS):
DIGITALOCEAN_TOKEN=dop_v1_... bash /var/www/kora-crm/deploy/ssl-wildcard.sh
```

O manualmente:

```bash
# Requiere token DO en /root/.secrets/certbot/digitalocean.ini (una vez)
apt-get install -y python3-certbot-dns-digitalocean
certbot certonly --dns-digitalocean \
  -d koracrm.cl -d '*.koracrm.cl' \
  --dns-digitalocean-credentials /root/.secrets/certbot/digitalocean.ini \
  --non-interactive --agree-tos -m admin@koracrm.cl
nginx -t && systemctl reload nginx
```

**No hace falta un certificado nuevo por cada cliente** si el wildcard está activo.
Verificar: `openssl s_client -connect demo.koracrm.cl:443 -servername demo.koracrm.cl | openssl x509 -noout -ext subjectAltName` debe incluir `DNS:*.koracrm.cl`.

## Flujo operativo por tipo de cliente

| Acción | Qué haces tú | Qué hace el sistema |
|--------|----------------|---------------------|
| **Demo gratis** (`koracrm.cl/prueba-gratis`) | Revisar lead en Atria; opcional llamada de calificación | Crea prospecto en Atria + tenant trial `{slug}.koracrm.cl` + correos al solicitante y a `MARKETING_LEAD_TO` |
| **Cliente producción (ej. Atria)** | Migración/backfill una vez | URL fija `atriasolutions.koracrm.cl` |
| **Nuevo cliente pagado** | Crear tenant (slug + membresías) vía panel/SQL | `{slug}.koracrm.cl` — sin DNS ni SSL extra si wildcard está activo |
| **DNS por cliente** | **No** (wildcard `*` ya apunta al servidor) | — |
| **SSL por cliente** | **No** (certificado `*.koracrm.cl`) | — |

Subdominios de tenant **no muestran** la landing de marketing: `/` redirige a `/login` con logo de la empresa.

## 5. Variables de entorno (backend)

```env
PLATFORM_DOMAIN=koracrm.cl
DEFAULT_TENANT_SLUG=atriasolutions
MARKETING_AUTO_PROVISION_TRIAL=true
MARKETING_TRIAL_DAYS=14
APP_PUBLIC_URL=https://koracrm.cl
# Responsable comercial de leads «Prueba gratis» (tenant Atria).
# Solo se usa si el usuario está Activo y con membresía active; si no, cae en DEMO_USER_ID.
MARKETING_LEAD_OWNER_EMAIL=ngutierrez@atriasolutions.cl
# MARKETING_LEAD_OWNER_USER_ID=...  # opcional
DEMO_USER_ID=b1000001-0001-4001-8001-000000000001
```

Frontend build:

```env
VITE_PLATFORM_DOMAIN=koracrm.cl
```

## 6. Migraciones facturación SII

```bash
psql -d kora_crm -f database/postgres/migrations/20260607_invoicing_sii_phase0.sql
psql -d kora_crm -f database/postgres/migrations/20260607_sii_schema.sql
```

Variables backend adicionales:

```env
SII_CREDENTIALS_ENCRYPTION_KEY=...   # AES-256, obligatorio en prod
SII_ENV=certification                # certification | production
```

En **Configuración → Facturación electrónica** cada tenant elige:
- **Manual** — folio SII ingresado al emitir
- **Integrado SII** — certificado `.p12`, CAF y emisión vía API

## 7. Cron jobs

```cron
0 3 * * * cd /var/www/kora-crm/backend && npm run job:purge-expired-trials
0 4 * * * cd /var/www/kora-crm/backend && npm run job:sync-sii-rcv
```

## 8. Verificación post-deploy

- `GET https://atriasolutions.koracrm.cl/api/v1/auth/tenant-by-host` → tenant Atria
- Login en subdominio con logo de organización
- Login central en `koracrm.cl/login` con selector si hay varias membresías
- Conteos de filas idénticos pre/post migración (solo cambia `tenant_id`)
