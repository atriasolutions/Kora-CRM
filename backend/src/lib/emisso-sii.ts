/**
 * @emisso/sii/dist/index.cjs usa __toESM(require("axios-retry"), 1), lo que deja
 * import_axios_retry.default como objeto en lugar de función en Node 20+.
 * node-forge funciona vía require; axios-retry requiere parche previo al cache.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function patchAxiosRetryForEmisso(): void {
  const axiosRetryPath = require.resolve('axios-retry')
  const axiosRetry = require(axiosRetryPath) as
    | ((...args: unknown[]) => unknown)
    | { default: (...args: unknown[]) => unknown }
  const fn = typeof axiosRetry === 'function' ? axiosRetry : axiosRetry.default
  if (typeof fn !== 'function') {
    throw new Error('No se pudo parchear axios-retry para @emisso/sii')
  }
  require.cache[axiosRetryPath]!.exports = fn
}

patchAxiosRetryForEmisso()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const emisso = require('@emisso/sii') as typeof import('@emisso/sii')

export const authenticate = emisso.authenticate
export const loadCertFromBase64 = emisso.loadCertFromBase64
export const createSiiSession = emisso.createSiiSession
export const listInvoices = emisso.listInvoices
export const parseCaf = emisso.parseCaf
export const buildDteXml = emisso.buildDteXml
export const signDte = emisso.signDte
export const uploadDte = emisso.uploadDte
export const applyTimbre = emisso.applyTimbre
