/** Probabilidad por etapa (alineado con frontend/src/lib/opportunity-metadata.ts). */

const STAGE_PROBABILITY: Record<string, number> = {
  Calificados: 10,
  'En diagnóstico': 20,
  Propuesta: 40,
  Negociación: 60,
  Cerrada: 100,
  'En espera cliente': 50,
  'Pausada internamente': 25,
  Perdida: 0,
  'No calificada': 0,
}

export function probabilityPercentForStage(stage: string): number {
  return STAGE_PROBABILITY[stage] ?? 10
}
