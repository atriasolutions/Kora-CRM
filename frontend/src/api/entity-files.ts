import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { EntityFileRecord } from '@/lib/entity-files'
import type { EntityFilesScope } from '@/lib/entity-files-storage'

const BASE = `${API_V1}/entity-files`

export async function listEntityFilesApi(
  entityType: EntityFilesScope,
  entityId: string,
): Promise<EntityFileRecord[]> {
  const res = await fetchJSON<{ data: EntityFileRecord[] }>(
    `${BASE}?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
  )
  return res.data
}

export async function syncEntityFilesApi(params: {
  entityType: EntityFilesScope
  entityId: string
  entityLabel?: string
  files: EntityFileRecord[]
}): Promise<EntityFileRecord[]> {
  const res = await fetchJSON<{ data: EntityFileRecord[] }>(`${BASE}/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel?.trim() || '',
      files: params.files.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        dataUrl: file.dataUrl,
        uploadedAt: file.uploadedAt,
        uploadedBy: file.uploadedBy,
      })),
    }),
  })
  return res.data
}
