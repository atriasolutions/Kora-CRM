#!/usr/bin/env bash
# Emite/renueva certificado wildcard *.koracrm.cl (una sola vez; cubre todos los tenants).
# Uso en el servidor (como root):
#   DIGITALOCEAN_TOKEN=dop_v1_... bash deploy/ssl-wildcard.sh

set -euo pipefail

if [[ -z "${DIGITALOCEAN_TOKEN:-}" ]]; then
  echo "Falta DIGITALOCEAN_TOKEN (API token de DigitalOcean con permiso DNS)." >&2
  echo "Crear en: https://cloud.digitalocean.com/account/api/tokens" >&2
  exit 1
fi

CREDS_DIR="/root/.secrets/certbot"
CREDS_FILE="${CREDS_DIR}/digitalocean.ini"
mkdir -p "$CREDS_DIR"
chmod 700 "$CREDS_DIR"
cat > "$CREDS_FILE" <<INI
dns_digitalocean_token = ${DIGITALOCEAN_TOKEN}
INI
chmod 600 "$CREDS_FILE"

if ! dpkg -l python3-certbot-dns-digitalocean >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y python3-certbot-dns-digitalocean
fi

certbot certonly --dns-digitalocean \
  -d koracrm.cl -d '*.koracrm.cl' \
  --dns-digitalocean-credentials "$CREDS_FILE" \
  --dns-digitalocean-propagation-seconds 60 \
  --non-interactive --agree-tos -m admin@koracrm.cl \
  --force-renewal

# Certbot puede crear koracrm.cl-0001 si ya existía otro certificado con ese nombre.
CERT_DIR="$(certbot certificates 2>/dev/null | awk '/Certificate Name: koracrm.cl/{f=1} f&&/Certificate Path:/{print $3; exit}')"
if [[ -z "$CERT_DIR" ]]; then
  echo "No se encontró ruta del certificado koracrm.cl" >&2
  exit 1
fi
CERT_LIVE="$(dirname "$CERT_DIR")"

NGINX_SITE="/etc/nginx/sites-enabled/koracrm"
if [[ -f "$NGINX_SITE" ]]; then
  sed -i "s|/etc/letsencrypt/live/koracrm.cl[^/]*/|${CERT_LIVE}/|g" "$NGINX_SITE"
fi

nginx -t
systemctl reload nginx

echo "OK — certificado wildcard activo (${CERT_LIVE}):"
certbot certificates 2>/dev/null | awk '/Certificate Name: koracrm.cl/{p=1} p{print} /^$/{if(p) exit}'
echo | openssl s_client -connect estafa.koracrm.cl:443 -servername estafa.koracrm.cl 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
