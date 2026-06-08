import axios from 'axios'
import forge from 'node-forge'
import { XMLParser } from 'fast-xml-parser'
import { SignedXml } from 'xml-crypto'

import { loadCertFromBase64 } from '../src/lib/emisso-sii.js'

type CertData = ReturnType<typeof loadCertFromBase64>

const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'
const EXCL_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#'
const INCL_C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#'

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

function buildManualSigned(seed: string, certData: CertData, c14nAlg: string): string {
  const safeSeed = escapeXml(seed)
  const unsignedDoc = `<getToken><item><Semilla>${safeSeed}</Semilla></item></getToken>`
  const digestValue = sha1Digest(unsignedDoc)
  const signedInfo =
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="${c14nAlg}"/>` +
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

function escapeSoapXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSigned(
  seed: string,
  certData: CertData,
  opts: {
    transforms: string[]
    semillaId?: string
    referenceUri?: string
    referenceXpath?: string
    c14n?: string
  },
): string {
  const semillaIdAttr = opts.semillaId ? ` Id="${opts.semillaId}"` : ''
  const unsignedDoc = `<getToken><item><Semilla${semillaIdAttr}>${seed}</Semilla></item></getToken>`
  const privateKeyPem = forge.pki.privateKeyToPem(certData.privateKey)
  const publicCertPem = forge.pki.certificateToPem(certData.certificate)
  const certB64 = certData.certDerB64.replace(/\s+/g, '')

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: publicCertPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: opts.c14n ?? EXCL_C14N,
    getKeyInfoContent(args?: { prefix?: string | null }) {
      const p = args?.prefix ? `${args.prefix}:` : ''
      return `<${p}KeyValue><${p}RSAKeyValue><${p}Modulus>${certData.modulusB64}</${p}Modulus><${p}Exponent>${certData.exponentB64}</${p}Exponent></${p}RSAKeyValue></${p}KeyValue><${p}X509Data><${p}Certificate>${certB64}</${p}Certificate></${p}X509Data>`
    },
  })

  sig.addReference({
    xpath: opts.referenceXpath ?? "//*[local-name(.)='getToken']",
    transforms: opts.transforms,
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: opts.referenceUri ?? '',
    isEmptyUri: opts.referenceUri === '' || opts.referenceUri == null,
  })

  sig.computeSignature(unsignedDoc, {
    location: { reference: "//*[local-name(.)='getToken']", action: 'append' },
  })

  const signed = sig.getSignedXml()
  return signed
}

async function main() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 86_400_000)
  const attrs = [{ name: 'commonName', value: '12345678-9' }]
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

  const baseUrl = 'https://palena.sii.cl'
  const seedEnv = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace"><soapenv:Body><def:getSeed/></soapenv:Body></soapenv:Envelope>`
  const seedRes = await axios.post(`${baseUrl}/DTEWS/CrSeed.jws`, seedEnv, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
  })
  const parsed = parser.parse(seedRes.data) as {
    Envelope: { Body: { getSeedResponse: { getSeedReturn: { '#text': string } } } }
  }
  const seed = (
    parser.parse(parsed.Envelope.Body.getSeedResponse.getSeedReturn['#text']) as {
      RESPUESTA: { RESP_BODY: { SEMILLA: string } }
    }
  ).RESPUESTA.RESP_BODY.SEMILLA

  const variants: Array<[string, string]> = [
    ['crypto-excl-enveloped-only', buildSigned(seed, certData, { transforms: [ENVELOPED] })],
    ['crypto-incl-enveloped-only', buildSigned(seed, certData, { transforms: [ENVELOPED], c14n: INCL_C14N })],
    ['manual-incl-cert-keyvalue', buildManualSigned(seed, certData, INCL_C14N)],
    [
      'crypto-excl-enveloped+exc',
      buildSigned(seed, certData, { transforms: [ENVELOPED, EXCL_C14N] }),
    ],
  ]

  for (const [name, signed] of variants) {
    const env = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace"><soapenv:Header/><soapenv:Body><def:getToken soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><pszXml>${escapeSoapXml(signed)}</pszXml></def:getToken></soapenv:Body></soapenv:Envelope>`
    const tokenRes = await axios.post(`${baseUrl}/DTEWS/GetTokenFromSeed.jws`, env, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
      validateStatus: () => true,
    })
    const ret = (parser.parse(tokenRes.data) as {
      Envelope?: { Body?: { getTokenResponse?: { getTokenReturn?: { '#text': string } } } }
    }).Envelope?.Body?.getTokenResponse?.getTokenReturn
    const hdr = (
      parser.parse(ret?.['#text'] ?? '') as {
        RESPUESTA?: { RESP_HDR?: { ESTADO?: string; GLOSA?: string } }
      }
    ).RESPUESTA?.RESP_HDR
    console.log(name, hdr)
  }
}

main().catch(console.error)
