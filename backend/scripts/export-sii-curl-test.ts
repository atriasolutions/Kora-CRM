/**
 * Genera archivos XML y comandos curl para probar autenticación SII (maullin/palena).
 *
 * Uso:
 *   npx tsx scripts/export-sii-curl-test.ts <cert.pfx> <password> [certification|production] [outDir]
 *
 * Paso 1 (semilla) se puede ejecutar solo con curl.
 * Paso 2 requiere XML firmado con el .pfx — este script lo genera.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import axios from 'axios'
import forge from 'node-forge'
import { XMLParser } from 'fast-xml-parser'
import { SignedXml } from 'xml-crypto'

import { loadCertFromBase64 } from '../src/lib/emisso-sii.js'

const certPath = process.argv[2]
const certPassword = process.argv[3]
const env = (process.argv[4] ?? 'certification') as 'certification' | 'production'
const outDir = process.argv[5] ?? join(process.cwd(), 'tmp', 'sii-curl-test')

if (!certPath || !certPassword) {
  console.error(
    'Uso: npx tsx scripts/export-sii-curl-test.ts <cert.pfx> <password> [certification|production] [outDir]',
  )
  process.exit(1)
}

const baseUrl =
  env === 'production' ? 'https://palena.sii.cl' : 'https://maullin.sii.cl'

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  parseTagValue: false,
})

function escapeSoapXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSignedSeedXml(
  seed: string,
  certData: ReturnType<typeof loadCertFromBase64>,
): string {
  const unsignedDoc = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`
  const privateKeyPem = forge.pki.privateKeyToPem(certData.privateKey)
  const publicCertPem = forge.pki.certificateToPem(certData.certificate)
  const certB64 = certData.certDerB64.replace(/\s+/g, '')

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: publicCertPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    getKeyInfoContent(args?: { prefix?: string | null }) {
      const p = args?.prefix ? `${args.prefix}:` : ''
      return `<${p}KeyValue><${p}RSAKeyValue><${p}Modulus>${certData.modulusB64}</${p}Modulus><${p}Exponent>${certData.exponentB64}</${p}Exponent></${p}RSAKeyValue></${p}KeyValue><${p}X509Data><${p}Certificate>${certB64}</${p}Certificate></${p}X509Data>`
    },
  })

  sig.addReference({
    xpath: "//*[local-name(.)='getToken']",
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: '',
    isEmptyUri: true,
  })

  sig.computeSignature(unsignedDoc, {
    location: { reference: "//*[local-name(.)='getToken']", action: 'append' },
  })

  return sig.getSignedXml()
}

function extractSoapReturnXml(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj['#text'] === 'string') return obj['#text']
  }
  throw new Error('Respuesta SII mal formada')
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

async function main() {
  mkdirSync(outDir, { recursive: true })

  const seedEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Header/>
<soapenv:Body>
<def:getSeed/>
</soapenv:Body>
</soapenv:Envelope>`

  const seedFile = join(outDir, '1-get-seed-request.xml')
  writeFileSync(seedFile, seedEnvelope)

  console.log(`\n=== Ambiente: ${env} (${baseUrl}) ===\n`)
  console.log('--- PASO 1: Obtener semilla (curl puro) ---\n')
  console.log(`curl -sS -X POST '${baseUrl}/DTEWS/CrSeed.jws' \\
  -H 'Content-Type: text/xml; charset=utf-8' \\
  -H 'SOAPAction: ""' \\
  --data-binary @'${seedFile}'`)

  const seedRes = await axios.post<string>(`${baseUrl}/DTEWS/CrSeed.jws`, seedEnvelope, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
    responseType: 'text',
  })
  writeFileSync(join(outDir, '1-get-seed-response.xml'), seedRes.data)

  const rawReturn = (
    parser.parse(seedRes.data) as {
      Envelope?: { Body?: { getSeedResponse?: { getSeedReturn?: unknown } } }
    }
  ).Envelope?.Body?.getSeedResponse?.getSeedReturn

  if (rawReturn == null) throw new Error('Sin semilla en respuesta SII')

  const inner = parser.parse(decodeHtmlEntities(extractSoapReturnXml(rawReturn))) as {
    RESPUESTA: { RESP_HDR: { ESTADO: string; GLOSA?: string }; RESP_BODY: { SEMILLA: string } }
  }
  const hdr = inner.RESPUESTA.RESP_HDR
  const seed = String(inner.RESPUESTA.RESP_BODY.SEMILLA)
  console.log(`\nSemilla ESTADO=${hdr.ESTADO} GLOSA=${hdr.GLOSA}`)
  console.log(`SEMILLA=${seed}\n`)

  const certBase64 = await import('node:fs').then((fs) =>
    fs.readFileSync(certPath).toString('base64'),
  )
  const certData = loadCertFromBase64(certBase64, certPassword)
  const signedSeed = buildSignedSeedXml(seed, certData)
  writeFileSync(join(outDir, '2-signed-seed.xml'), signedSeed)

  const tokenEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Header/>
<soapenv:Body>
<def:getToken soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<pszXml>${escapeSoapXml(signedSeed)}</pszXml>
</def:getToken>
</soapenv:Body>
</soapenv:Envelope>`

  const tokenFile = join(outDir, '2-get-token-request.xml')
  writeFileSync(tokenFile, tokenEnvelope)

  console.log('--- PASO 2: Obtener token (curl con XML ya firmado) ---\n')
  console.log(`curl -sS -X POST '${baseUrl}/DTEWS/GetTokenFromSeed.jws' \\
  -H 'Content-Type: text/xml; charset=utf-8' \\
  -H 'SOAPAction: ""' \\
  --data-binary @'${tokenFile}'`)

  const tokenRes = await axios.post<string>(`${baseUrl}/DTEWS/GetTokenFromSeed.jws`, tokenEnvelope, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
    responseType: 'text',
    validateStatus: () => true,
  })
  writeFileSync(join(outDir, '2-get-token-response.xml'), tokenRes.data)

  const tokenReturn = (
    parser.parse(tokenRes.data) as {
      Envelope?: { Body?: { getTokenResponse?: { getTokenReturn?: unknown } } }
    }
  ).Envelope?.Body?.getTokenResponse?.getTokenReturn

  if (tokenReturn != null) {
    const tokenInner = parser.parse(decodeHtmlEntities(extractSoapReturnXml(tokenReturn))) as {
      RESPUESTA?: { RESP_HDR?: { ESTADO?: string; GLOSA?: string }; RESP_BODY?: { TOKEN?: string } }
    }
    const th = tokenInner.RESPUESTA?.RESP_HDR
    const token = tokenInner.RESPUESTA?.RESP_BODY?.TOKEN
    console.log(`\nToken ESTADO=${th?.ESTADO} GLOSA=${th?.GLOSA}`)
    if (token) console.log(`TOKEN=${token}`)
  }

  console.log(`\nArchivos guardados en: ${outDir}`)
  console.log('\nPostman: POST → Body raw XML → pegar contenido de 1-get-seed-request.xml o 2-get-token-request.xml')
  console.log('Headers: Content-Type: text/xml; charset=utf-8 , SOAPAction: ""')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
