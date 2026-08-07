import type { PruebaCaso } from '@/data/pruebas-solicitud.mock'
import { emptyPruebaCaso } from '@/data/pruebas-solicitud.mock'
import { createEntityFileId, formatFileUploadedAt } from '@/lib/entity-files'
import type { PruebaCasoFile } from '@/lib/prueba-caso-files'
import {
  extractFileIdsFromDescription,
  remapDescriptionFileIds,
  serializeDescriptionHtml,
} from '@/lib/solicitud-description-media'

export function duplicatePruebaCasoDraft(
  source: PruebaCaso,
  targetIndex: number,
  pruebaCode: string,
): PruebaCaso {
  const draft = emptyPruebaCaso(targetIndex, pruebaCode)
  return {
    ...draft,
    shortDescription: source.shortDescription,
    inputData: source.inputData,
    steps: source.steps,
    expectedResult: source.expectedResult,
    obtainedResult: source.obtainedResult,
    executorOk: source.executorOk,
    executorNotes: source.executorNotes,
    executorOkAt: source.executorOkAt,
    evidenceHtml: '',
    clientOk: null,
    clientNotes: '',
    clientOkAt: null,
  }
}

export function clonePruebaCasoEvidenceMedia(
  html: string,
  sourceFiles: PruebaCasoFile[],
): { html: string; files: PruebaCasoFile[] } {
  const referencedIds = new Set(extractFileIdsFromDescription(html))
  const idMap = new Map<string, string>()
  const files: PruebaCasoFile[] = []

  for (const file of sourceFiles) {
    if (!referencedIds.has(file.id) || !file.dataUrl?.trim()) continue
    const newId = createEntityFileId('pc-file')
    idMap.set(file.id, newId)
    files.push({
      ...file,
      id: newId,
      uploadedAt: formatFileUploadedAt(),
    })
  }

  const serialized = serializeDescriptionHtml(html)
  return {
    html: remapDescriptionFileIds(serialized, idMap),
    files,
  }
}
