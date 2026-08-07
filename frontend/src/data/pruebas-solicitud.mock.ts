export type PruebaCaso = {
  id: string
  code: string
  sortOrder: number
  shortDescription: string
  inputData: string
  steps: string
  expectedResult: string
  obtainedResult: string
  executorOk: boolean | null
  executorNotes: string
  executorOkAt: string | null
  evidenceHtml: string
  clientOk: boolean | null
  clientNotes: string
  clientOkAt: string | null
}

export type PruebaSolicitudListItem = {
  id: string
  code: string
  solicitudId: string
  solicitudCode: string
  solicitudTitle: string
  description: string
  executedAt: string
  caseCount: number
  clientOkCount: number
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
  companyId?: string
  companyName?: string
}

export type PruebaSolicitudDetail = PruebaSolicitudListItem & {
  cases: PruebaCaso[]
}

export function emptyPruebaCaso(index: number, pruebaCode = ''): PruebaCaso {
  const suffix = String(index + 1).padStart(2, '0')
  return {
    id: `caso-temp-${Date.now()}-${index}`,
    code: pruebaCode ? `${pruebaCode}-CP-${suffix}` : `CP-${suffix}`,
    sortOrder: index,
    shortDescription: '',
    inputData: '',
    steps: '',
    expectedResult: '',
    obtainedResult: '',
    executorOk: null,
    executorNotes: '',
    executorOkAt: null,
    evidenceHtml: '',
    clientOk: null,
    clientNotes: '',
    clientOkAt: null,
  }
}
