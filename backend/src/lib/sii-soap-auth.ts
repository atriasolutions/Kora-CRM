import axios from 'axios'
import { readFileSync } from 'node:fs'
import forge from 'node-forge'
import { XMLParser } from 'fast-xml-parser'
import { SignedXml } from 'xml-crypto'

import { loadCertFromBase64 } from './emisso-sii.js'

export type SiiAuthEnv = 'certification' | 'production'

export type SiiAuthenticateConfig = {
  certPath: string
  certPassword: string
  env: SiiAuthEnv
}

export type SiiAuthResult = {
  token: string
  expiresAt: Date
}

type CertData = ReturnType<typeof loadCertFromBase64>

const soapParser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  parseTagValue: false,
})

function getSiiBaseUrl(env: SiiAuthEnv): string {
  return env === 'production' ? 'https://palena.sii.cl' : 'https://maullin.sii.cl'
}

function buildGetSeedEnvelope(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Header/>
<soapenv:Body>
<def:getSeed/>
</soapenv:Body>
</soapenv:Envelope>`
}

function escapeSoapXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildGetTokenEnvelope(signedSeedXml: string): string {
  const pszXml = escapeSoapXml(signedSeedXml)
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
<soapenv:Header/>
<soapenv:Body>
<def:getToken soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<pszXml>${pszXml}</pszXml>
</def:getToken>
</soapenv:Body>
</soapenv:Envelope>`
}

async function postSoap(url: string, envelope: string): Promise<string> {
  const res = await axios.post<string>(url, envelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '""',
    },
    timeout: 30_000,
    responseType: 'text',
    validateStatus: () => true,
  })

  const body = String(res.data ?? '')
  if (res.status >= 400 || body.includes('<soapenv:Fault>') || body.includes('<faultstring>')) {
    const fault =
      body.match(/<faultstring>([^<]+)/i)?.[1]?.trim() ??
      body.match(/<GLOSA>([^<]+)/i)?.[1]?.trim()
    throw new Error(fault ?? `El SII respondió HTTP ${res.status}`)
  }
  return body
}

function decodeSiiMessage(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number.parseInt(code, 10)
      return Number.isFinite(n) ? String.fromCharCode(n) : _
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
}

function extractSoapReturnXml(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj['#text'] === 'string') return obj['#text']
  }
  throw new Error('Respuesta SII mal formada')
}

function parseSiiRespuesta(rawReturn: unknown, context: string): Record<string, unknown> {
  const innerXml = extractSoapReturnXml(rawReturn)
  const inner = soapParser.parse(innerXml) as { RESPUESTA?: Record<string, unknown> }
  const respuesta = inner.RESPUESTA ?? (inner as Record<string, unknown>)
  const hdr = respuesta?.RESP_HDR as Record<string, unknown> | undefined
  const estado = String(hdr?.ESTADO ?? '')
  if (estado !== '00') {
    const glosa = decodeSiiMessage(String(hdr?.GLOSA ?? 'Error desconocido'))
    let detail = glosa
    if (estado === '10') {
      detail = `${glosa}. El SII recibió el XML firmado pero no pudo emitir el token. Verifica en www.sii.cl que el RUT del titular del certificado tenga habilitada la autenticación por certificado digital.`
    }
    throw new Error(`SII ${context}: ${detail} (estado ${estado})`)
  }
  return respuesta
}

function parseSeedFromSoap(responseXml: string): string {
  const parsed = soapParser.parse(responseXml) as {
    Envelope?: { Body?: { getSeedResponse?: { getSeedReturn?: string } } }
  }
  const rawReturn = parsed?.Envelope?.Body?.getSeedResponse?.getSeedReturn
  if (!rawReturn) throw new Error('Respuesta SII sin semilla')
  const respuesta = parseSiiRespuesta(rawReturn, 'CrSeed')
  const semilla = (respuesta.RESP_BODY as Record<string, unknown> | undefined)?.SEMILLA
  if (semilla == null || semilla === '') throw new Error('No se pudo extraer la semilla del SII')
  return String(semilla)
}

function parseTokenFromSoap(responseXml: string): string {
  const parsed = soapParser.parse(responseXml) as {
    Envelope?: { Body?: { getTokenResponse?: { getTokenReturn?: string } } }
  }
  const rawReturn = parsed?.Envelope?.Body?.getTokenResponse?.getTokenReturn
  if (!rawReturn) throw new Error('Respuesta SII sin token')
  const respuesta = parseSiiRespuesta(rawReturn, 'GetTokenFromSeed')
  const token = (respuesta.RESP_BODY as Record<string, unknown> | undefined)?.TOKEN
  if (token == null || token === '') throw new Error('No se pudo extraer el token del SII')
  return String(token)
}

function buildSignedSeedXml(seed: string, certData: CertData): string {
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
      const prefix = args?.prefix
      const p = prefix ? `${prefix}:` : ''
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

/** Autenticación SOAP SII (semilla + token) con headers y envelopes corregidos. */
export async function authenticateSii(config: SiiAuthenticateConfig): Promise<SiiAuthResult> {
  const baseUrl = getSiiBaseUrl(config.env)
  const certBase64 = readFileSync(config.certPath).toString('base64')
  const certData = loadCertFromBase64(certBase64, config.certPassword)

  const seedResponse = await postSoap(
    `${baseUrl}/DTEWS/CrSeed.jws`,
    buildGetSeedEnvelope(),
  )
  const seed = parseSeedFromSoap(seedResponse)
  const signedSeed = buildSignedSeedXml(seed, certData)

  const tokenResponse = await postSoap(
    `${baseUrl}/DTEWS/GetTokenFromSeed.jws`,
    buildGetTokenEnvelope(signedSeed),
  )
  const token = parseTokenFromSoap(tokenResponse)

  return {
    token,
    expiresAt: new Date(Date.now() + 28 * 60 * 1000),
  }
}

const RUT_PATTERN = /(\d{1,2}(?:\.\d{3}){2}-[\dkK])|(\d{7,8}-[\dkK])/i

function normalizeRut(raw: string | undefined): string | null {
  if (!raw) return null
  const match = raw.match(RUT_PATTERN)
  const value = match?.[1] ?? match?.[2]
  return value?.replace(/\./g, '') ?? null
}

function extensionText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  try {
    const raw =
      typeof value === 'object' && 'data' in value
        ? String((value as { data: string }).data)
        : String(value)
    return Buffer.from(raw, 'binary').toString('latin1')
  } catch {
    return String(value)
  }
}

function extractCertRut(certificate: forge.pki.Certificate): string | null {
  const subjectText = [
    certificate.subject.toString(),
    ...certificate.subject.attributes.map((a) => String(a.value ?? '')),
  ].join(' ')
  const fromSubject = normalizeRut(subjectText)
  if (fromSubject) return fromSubject

  const serialField = certificate.subject.getField('serialNumber')
  const fromSerial = normalizeRut(String(serialField?.value ?? ''))
  if (fromSerial) return fromSerial

  for (const ext of certificate.extensions ?? []) {
    if (ext.name !== 'subjectAltName' && ext.name !== 'issuerAltName') continue
    const fromExt = normalizeRut(extensionText(ext.value))
    if (fromExt) return fromExt
  }

  return null
}

export function extractCertMetadata(certBase64: string, certPassword: string): {
  certRut: string | null
  certExpiresAt: Date | null
} {
  const certData = loadCertFromBase64(certBase64, certPassword)
  const expiresAt = certData.certificate.validity.notAfter
  return {
    certRut: extractCertRut(certData.certificate),
    certExpiresAt: expiresAt ?? null,
  }
}
