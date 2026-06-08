import axios from 'axios'
import forge from 'node-forge'
import { XMLParser } from 'fast-xml-parser'
import { SignedXml } from 'xml-crypto'

import { loadCertFromBase64 } from '../src/lib/emisso-sii.js'

const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'
const EXCL_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#'
const INCL_C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#'

type CertData = ReturnType<typeof loadCertFromBase64>

function escapeSoapXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

/** Firma manual como @emisso/sii (xml-dsig.ts) */
function buildEmissoManualSigned(seed: string, certData: CertData): string {
  const safeSeed = seed
  const unsignedDoc = `<getToken><item><Semilla>${safeSeed}</Semilla></item></getToken>`
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
    `<X509Data><Certificate>${certB64}</Certificate></X509Data>` +
    `</KeyInfo>`
  const signature =
    `<Signature xmlns="${DSIG_NS}">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    keyInfo +
    `</Signature>`
  return `<getToken><item><Semilla>${safeSeed}</Semilla></item>${signature}</getToken>`
}

function buildXmlCryptoSigned(
  seed: string,
  certData: CertData,
  c14n: string,
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
      return `<${p}KeyValue><${p}RSAKeyValue><${p}Modulus>${certData.modulusB64}</${p}Modulus><${p}Exponent>${certData.exponentB64}</${p}Exponent></${p}RSAKeyValue></${p}KeyValue><${p}X509Data><${p}Certificate>${certB64}</${p}Certificate></${p}X509Data>`
    },
  })

  sig.addReference({
    xpath: "//*[local-name(.)='getToken']",
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

async function main() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 86_400_000)
  const attrs = [{ name: 'commonName', value: '17306316-4' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())
  const p12b64 = forge.util.encode64(
    forge.asn1
      .toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'test', { generateLocalKeyId: true }))
      .getBytes(),
  )
  const certData = loadCertFromBase64(p12b64, 'test')

  const parser = new XMLParser({
    removeNSPrefix: true,
    ignoreAttributes: false,
    parseTagValue: false,
  })

  const seedEnv = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace"><soapenv:Body><def:getSeed/></soapenv:Body></soapenv:Envelope>`
  const seedRes = await axios.post('https://palena.sii.cl/DTEWS/CrSeed.jws', seedEnv, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
  })
  const rawReturn = (parser.parse(seedRes.data) as {
    Envelope?: { Body?: { getSeedResponse?: { getSeedReturn?: unknown } } }
  }).Envelope?.Body?.getSeedResponse?.getSeedReturn
  const innerXml =
    typeof rawReturn === 'string'
      ? rawReturn
      : (rawReturn as { '#text'?: string } | undefined)?.['#text']
  const seed = (
    parser.parse(innerXml ?? '') as { RESPUESTA: { RESP_BODY: { SEMILLA: string } } }
  ).RESPUESTA.RESP_BODY.SEMILLA

  const variants: Array<[string, string]> = [
    ['@emisso/sii manual (incl C14N)', buildEmissoManualSigned(seed, certData)],
    ['Kora actual (xml-crypto excl C14N)', buildXmlCryptoSigned(seed, certData, EXCL_C14N)],
    ['xml-crypto incl C14N', buildXmlCryptoSigned(seed, certData, INCL_C14N)],
  ]

  for (const [name, signed] of variants) {
    const env = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace"><soapenv:Header/><soapenv:Body><def:getToken soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><pszXml>${escapeSoapXml(signed)}</pszXml></def:getToken></soapenv:Body></soapenv:Envelope>`
    const tokenRes = await axios.post(
      'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws',
      env,
      {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
        validateStatus: () => true,
      },
    )
    const ret = (parser.parse(tokenRes.data) as {
      Envelope?: { Body?: { getTokenResponse?: { getTokenReturn?: unknown } } }
    }).Envelope?.Body?.getTokenResponse?.getTokenReturn
    const txt =
      typeof ret === 'string' ? ret : (ret as { '#text'?: string } | undefined)?.['#text']
    const hdr = (
      parser.parse(txt ?? '') as {
        RESPUESTA?: { RESP_HDR?: { ESTADO?: string; GLOSA?: string } }
      }
    ).RESPUESTA?.RESP_HDR
    console.log(name, '→', hdr?.ESTADO, hdr?.GLOSA?.slice(0, 60))
  }
}

main().catch(console.error)
