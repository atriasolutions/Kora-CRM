/**
 * Matriz de pruebas autenticación SII (semilla + token).
 *
 * Uso:
 *   npx tsx scripts/sii-auth-matrix.ts <cert.pfx> <password>
 */
import { readFileSync } from 'node:fs'

import axios from 'axios'
import forge from 'node-forge'
import { XMLParser } from 'fast-xml-parser'
import { SignedXml } from 'xml-crypto'

import { authenticateSii } from '../src/lib/sii-soap-auth.js'
import { authenticate as emissoAuthenticate, loadCertFromBase64 } from '../src/lib/emisso-sii.js'

const certPath = process.argv[2]
const certPassword = process.argv[3]

if (!certPath || !certPassword) {
  console.error('Uso: npx tsx scripts/sii-auth-matrix.ts <cert.pfx> <password>')
  process.exit(1)
}

const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'
const EXCL_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#'
const INCL_C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#'

type CertData = ReturnType<typeof loadCertFromBase64>
type Env = 'certification' | 'production'

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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function extractSoapReturnXml(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj['#text'] === 'string') return obj['#text']
  }
  throw new Error('Respuesta SII mal formada')
}

function sha1Digest(data: string): string {
  const md = forge.md.sha1.create()
  md.update(data, 'utf8')
  return forge.util.encode64(md.digest().bytes())
}

function rsaSha1Sign(data: string, privateKey: forge.pki.rsa.PrivateKey): string {
  const md = forge.md.sha1.create()
  md.update(data, 'utf8')
  return forge.util.encode64(privateKey.sign(md))
}

function buildEmissoManualSigned(seed: string, certData: CertData, certTag: 'Certificate' | 'X509Certificate'): string {
  const unsignedDoc = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`
  const digestValue = sha1Digest(unsignedDoc)
  const signedInfo =
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="${INCL_C14N}"/>` +
    `<SignatureMethod Algorithm="${DSIG_NS}rsa-sha1"/>` +
    `<Reference URI="">` +
    `<Transforms><Transform Algorithm="${DSIG_NS}enveloped-signature"/></Transforms>` +
    `<DigestMethod Algorithm="${DSIG_NS}sha1"/>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`
  const signatureValue = rsaSha1Sign(signedInfo, certData.privateKey)
  const certB64 = certData.certDerB64.replace(/\s+/g, '')
  const keyInfo =
    `<KeyInfo>` +
    `<KeyValue><RSAKeyValue><Modulus>${certData.modulusB64}</Modulus><Exponent>${certData.exponentB64}</Exponent></RSAKeyValue></KeyValue>` +
    `<X509Data><${certTag}>${certB64}</${certTag}></X509Data>` +
    `</KeyInfo>`
  const signature =
    `<Signature xmlns="${DSIG_NS}">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    keyInfo +
    `</Signature>`
  return `<getToken><item><Semilla>${seed}</Semilla></item>${signature}</getToken>`
}

function buildXmlCryptoSigned(
  seed: string,
  certData: CertData,
  c14n: string,
  certTag: 'Certificate' | 'X509Certificate',
  referenceTarget: 'getToken' | 'item',
): string {
  const unsignedDoc = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`
  const privateKeyPem = forge.pki.privateKeyToPem(certData.privateKey)
  const publicCertPem = forge.pki.certificateToPem(certData.certificate)
  const certB64 = certData.certDerB64.replace(/\s+/g, '')

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: publicCertPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: c14n,
    getKeyInfoContent(args?: { prefix?: string | null }) {
      const p = args?.prefix ? `${args.prefix}:` : ''
      return `<${p}KeyValue><${p}RSAKeyValue><${p}Modulus>${certData.modulusB64}</${p}Modulus><${p}Exponent>${certData.exponentB64}</${p}Exponent></${p}RSAKeyValue></${p}KeyValue><${p}X509Data><${p}${certTag}>${certB64}</${p}${certTag}></${p}X509Data>`
    },
  })

  sig.addReference({
    xpath: referenceTarget === 'getToken' ? "//*[local-name(.)='getToken']" : "//*[local-name(.)='item']",
    transforms: [ENVELOPED],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: '',
    isEmptyUri: true,
  })

  sig.computeSignature(unsignedDoc, {
    location: { reference: "//*[local-name(.)='getToken']", action: 'append' },
  })

  return sig.getSignedXml()
}

function buildSeedEnvelope(variant: 'getSeed' | 'getCrSeed' | 'minimal'): string {
  if (variant === 'getCrSeed') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Body>
<def:getCrSeed/>
</soapenv:Body>
</soapenv:Envelope>`
  }
  if (variant === 'minimal') {
    return `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace"><soapenv:Body><def:getSeed/></soapenv:Body></soapenv:Envelope>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Header/>
<soapenv:Body>
<def:getSeed/>
</soapenv:Body>
</soapenv:Envelope>`
}

async function fetchSeed(baseUrl: string, seedVariant: 'getSeed' | 'getCrSeed' | 'minimal'): Promise<string> {
  const envelope = buildSeedEnvelope(seedVariant)
  const res = await axios.post<string>(`${baseUrl}/DTEWS/CrSeed.jws`, envelope, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
    responseType: 'text',
    timeout: 30_000,
    validateStatus: () => true,
  })
  const rawReturn = (
    parser.parse(res.data) as {
      Envelope?: { Body?: { getSeedResponse?: { getSeedReturn?: unknown } } }
    }
  ).Envelope?.Body?.getSeedResponse?.getSeedReturn

  if (rawReturn == null) {
    throw new Error(`Sin semilla (HTTP ${res.status})`)
  }

  const inner = parser.parse(decodeHtmlEntities(extractSoapReturnXml(rawReturn))) as {
    RESPUESTA: { RESP_HDR: { ESTADO: string; GLOSA?: string }; RESP_BODY: { SEMILLA: string } }
  }
  const estado = inner.RESPUESTA.RESP_HDR.ESTADO
  if (estado !== '00') {
    throw new Error(`CrSeed estado ${estado}: ${inner.RESPUESTA.RESP_HDR.GLOSA}`)
  }
  return String(inner.RESPUESTA.RESP_BODY.SEMILLA)
}

async function tryToken(
  baseUrl: string,
  signedSeed: string,
): Promise<{ estado: string; glosa: string; token?: string }> {
  const tokenEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Header/>
<soapenv:Body>
<def:getToken soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<pszXml>${escapeSoapXml(signedSeed)}</pszXml>
</def:getToken>
</soapenv:Body>
</soapenv:Envelope>`

  const res = await axios.post<string>(`${baseUrl}/DTEWS/GetTokenFromSeed.jws`, tokenEnvelope, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
    responseType: 'text',
    timeout: 30_000,
    validateStatus: () => true,
  })

  const rawReturn = (
    parser.parse(res.data) as {
      Envelope?: { Body?: { getTokenResponse?: { getTokenReturn?: unknown } } }
    }
  ).Envelope?.Body?.getTokenResponse?.getTokenReturn

  if (rawReturn == null) {
    return { estado: 'HTTP', glosa: `HTTP ${res.status} sin getTokenReturn` }
  }

  const inner = parser.parse(decodeHtmlEntities(extractSoapReturnXml(rawReturn))) as {
    RESPUESTA?: { RESP_HDR?: { ESTADO?: string; GLOSA?: string }; RESP_BODY?: { TOKEN?: string } }
  }
  return {
    estado: String(inner.RESPUESTA?.RESP_HDR?.ESTADO ?? '?'),
    glosa: String(inner.RESPUESTA?.RESP_HDR?.GLOSA ?? ''),
    token: inner.RESPUESTA?.RESP_BODY?.TOKEN,
  }
}

function printCertInfo(certData: CertData): void {
  const subj = certData.certificate.subject.attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(', ')
  const iss = certData.certificate.issuer.attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(', ')
  console.log('\n=== Certificado ===')
  console.log('Subject:', subj)
  console.log('Issuer:', iss)
  console.log('Válido:', certData.certificate.validity.notBefore, '→', certData.certificate.validity.notAfter)
  console.log('Serial:', certData.certificate.serialNumber)
}

async function main() {
  const certBase64 = readFileSync(certPath).toString('base64')
  const certData = loadCertFromBase64(certBase64, certPassword)
  printCertInfo(certData)

  type Variant = { name: string; sign: (seed: string) => string }
  const signingVariants: Variant[] = [
    {
      name: 'Kora (xml-crypto excl C14N + Certificate)',
      sign: (seed) => buildXmlCryptoSigned(seed, certData, EXCL_C14N, 'Certificate', 'getToken'),
    },
    {
      name: 'xml-crypto incl C14N + Certificate',
      sign: (seed) => buildXmlCryptoSigned(seed, certData, INCL_C14N, 'Certificate', 'getToken'),
    },
    {
      name: 'emisso manual incl C14N + Certificate',
      sign: (seed) => buildEmissoManualSigned(seed, certData, 'Certificate'),
    },
    {
      name: 'emisso manual incl C14N + X509Certificate',
      sign: (seed) => buildEmissoManualSigned(seed, certData, 'X509Certificate'),
    },
    {
      name: 'xml-crypto excl C14N ref=item',
      sign: (seed) => buildXmlCryptoSigned(seed, certData, EXCL_C14N, 'Certificate', 'item'),
    },
  ]

  const envs: Array<{ label: string; env: Env; baseUrl: string }> = [
    { label: 'maullin (certificación)', env: 'certification', baseUrl: 'https://maullin.sii.cl' },
    { label: 'palena (producción)', env: 'production', baseUrl: 'https://palena.sii.cl' },
  ]

  console.log('\n=== Matriz firma × ambiente ===\n')
  console.log('| Ambiente | Variante firma | ESTADO | GLOSA |')
  console.log('|----------|----------------|--------|-------|')

  let anySuccess = false

  for (const { label, baseUrl } of envs) {
    let seed: string
    try {
      seed = await fetchSeed(baseUrl, 'getSeed')
    } catch (e) {
      console.log(`| ${label} | (semilla) | ERR | ${e instanceof Error ? e.message : e} |`)
      continue
    }

    for (const variant of signingVariants) {
      try {
        const signed = variant.sign(seed)
        const result = await tryToken(baseUrl, signed)
        const ok = result.estado === '00'
        if (ok) anySuccess = true
        const glosaShort = result.glosa.slice(0, 50).replace(/\|/g, '/')
        console.log(`| ${label} | ${variant.name} | ${result.estado} | ${glosaShort}${result.token ? ' ✓TOKEN' : ''} |`)
      } catch (e) {
        console.log(`| ${label} | ${variant.name} | EXC | ${e instanceof Error ? e.message : e} |`)
      }
    }
  }

  console.log('\n=== authenticateSii (Kora) ===')
  for (const env of ['certification', 'production'] as const) {
    try {
      const r = await authenticateSii({ certPath, certPassword, env })
      anySuccess = true
      console.log(`${env}: OK token len=${r.token.length}, expira ${r.expiresAt.toISOString()}`)
    } catch (e) {
      console.log(`${env}: FAIL — ${e instanceof Error ? e.message : e}`)
    }
  }

  console.log('\n=== @emisso/sii authenticate (certPath API) ===')
  for (const env of ['certification', 'production'] as const) {
    try {
      const r = await emissoAuthenticate({
        certPath,
        certPassword,
        env,
      })
      anySuccess = true
      console.log(`${env}: OK token len=${r.token.length}`)
    } catch (e) {
      console.log(`${env}: FAIL — ${e instanceof Error ? e.message : e}`)
    }
  }

  console.log('\n=== Resumen ===')
  if (anySuccess) {
    console.log('✓ Al menos una combinación obtuvo token.')
  } else {
    console.log('✗ Ninguna combinación obtuvo token.')
    console.log('Estado 10 = SII validó firma XML pero rechazó crear token (permisos/registro del titular del cert).')
    console.log('Revisar: perfil auth cert en SII, usuarios autorizados maullin, centralización cert Firma.cl.')
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
