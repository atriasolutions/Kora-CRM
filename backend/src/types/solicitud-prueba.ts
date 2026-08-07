export type PruebaCasoDto = {
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

export type PruebaCasoInput = {
  id?: string
  shortDescription?: string
  inputData?: string
  steps?: string
  expectedResult?: string
  obtainedResult?: string
  executorOk?: boolean | null
  executorNotes?: string
  evidenceHtml?: string
  clientOk?: boolean | null
  clientNotes?: string
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
  cases: PruebaCasoDto[]
}

export type CreatePruebaSolicitudInput = {
  solicitudId: string
  description?: string
  executedAt?: string
  cases?: PruebaCasoInput[]
}

export type UpdatePruebaSolicitudInput = {
  description?: string
  executedAt?: string | null
}

export type UpdatePruebaCasosInput = {
  cases: PruebaCasoInput[]
}

export type ClientReviewPruebaCasoInput = {
  clientOk: boolean
  clientNotes?: string
}
