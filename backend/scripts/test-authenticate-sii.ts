import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import forge from 'node-forge'

import { authenticateSii } from '../src/lib/sii-soap-auth.js'

async function main() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 86_400_000)
  cert.setSubject([{ name: 'commonName', value: '17306316-4' }])
  cert.setIssuer([{ name: 'commonName', value: '17306316-4' }])
  cert.sign(keys.privateKey, forge.md.sha256.create())
  const p12 = forge.asn1
    .toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'test', { generateLocalKeyId: true }))
    .getBytes()
  const path = join(tmpdir(), 'test-sii.p12')
  writeFileSync(path, Buffer.from(p12, 'binary'))
  try {
    const result = await authenticateSii({
      certPath: path,
      certPassword: 'test',
      env: 'production',
    })
    console.log('SUCCESS token length', result.token.length)
  } catch (e) {
    console.log('ERROR', e instanceof Error ? e.message : e)
  } finally {
    unlinkSync(path)
  }
}

main().catch(console.error)
