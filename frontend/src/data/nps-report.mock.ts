export type NpsSegmentRow = {
  segment: string
  nps: number
  responses: number
  promoters: number
  detractors: number
}

export type NpsTrendPoint = {
  period: string
  nps: number
}

export type NpsVerbatim = {
  id: string
  score: number
  company: string
  comment: string
}

export type NpsReportResult = {
  generatedAt: string
  overallNps: number
  totalResponses: number
  promotersPct: number
  passivesPct: number
  detractorsPct: number
  vsPreviousQuarter: number
  bySegment: NpsSegmentRow[]
  trend: NpsTrendPoint[]
  verbatims: NpsVerbatim[]
}

export function buildNpsReportResult(): NpsReportResult {
  const now = new Date()
  const generatedAt = now.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    generatedAt,
    overallNps: 52,
    totalResponses: 384,
    promotersPct: 58,
    passivesPct: 28,
    detractorsPct: 14,
    vsPreviousQuarter: 6,
    bySegment: [
      { segment: 'Enterprise', nps: 61, responses: 42, promoters: 67, detractors: 6 },
      { segment: 'Mid-market', nps: 54, responses: 118, promoters: 59, detractors: 12 },
      { segment: 'PYME', nps: 47, responses: 156, promoters: 52, detractors: 18 },
      { segment: 'Partner', nps: 49, responses: 38, promoters: 55, detractors: 15 },
      { segment: 'Renovaciones', nps: 56, responses: 30, promoters: 60, detractors: 11 },
    ],
    trend: [
      { period: 'Q3 2023', nps: 41 },
      { period: 'Q4 2023', nps: 44 },
      { period: 'Q1 2024', nps: 46 },
      { period: 'Q2 2024', nps: 52 },
    ],
    verbatims: [
      {
        id: 'v1',
        score: 10,
        company: 'Tech Solutions',
        comment: 'El onboarding fue excelente y el soporte responde muy rápido.',
      },
      {
        id: 'v2',
        score: 9,
        company: 'Nova Retail',
        comment: 'Nos ayudó a unificar pipeline y facturación en un solo lugar.',
      },
      {
        id: 'v3',
        score: 7,
        company: 'Industrial Plus',
        comment: 'Buen producto; faltaría más flexibilidad en reportes personalizados.',
      },
      {
        id: 'v4',
        score: 6,
        company: 'BlueWave',
        comment: 'Funciona bien, pero la curva de aprendizaje fue algo alta al inicio.',
      },
      {
        id: 'v5',
        score: 4,
        company: 'AgroSur',
        comment: 'Tuvimos demoras en integraciones con nuestro ERP legado.',
      },
    ],
  }
}
