#!/usr/bin/env bash
# Flujo Postman automatizado: semilla + token firmado (equivalente a la colección Postman).
# Uso: ./scripts/run-sii-postman-flow.sh <cert.pfx> <password> [certification|production]
set -euo pipefail
cd "$(dirname "$0")/.."

CERT="${1:?cert.pfx requerido}"
PASS="${2:?password requerida}"
ENV="${3:-certification}"

echo "Generando XML y probando token ($ENV)..."
npx tsx scripts/export-sii-curl-test.ts "$CERT" "$PASS" "$ENV"

OUT="tmp/sii-curl-test"
echo ""
echo "=== Postman manual ==="
echo "1. Importa postman/SII-Autenticacion-SOAP.postman_collection.json"
echo "2. Importa postman/SII-maullin.postman_environment.json"
echo "3. Request 1: body = $OUT/1-get-seed-request.xml"
echo "4. Request 2: pegar contenido de $OUT/2-get-token-request.xml en token_request_xml"
echo ""
echo "=== curl directo (ya ejecutado arriba) ==="
echo "Respuesta token: $OUT/2-get-token-response.xml"
