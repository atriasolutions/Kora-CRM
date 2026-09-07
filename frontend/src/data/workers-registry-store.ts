import type { WorkerListItem } from '@/data/workers.mock'

let registrySnapshot: WorkerListItem[] = []

export function syncRegistryWorkers(items: WorkerListItem[]) {
  registrySnapshot = items
}

export function getRegistryWorkerById(id: string): WorkerListItem | undefined {
  return registrySnapshot.find((row) => row.id === id)
}

export function getAllKnownWorkers(): WorkerListItem[] {
  return registrySnapshot
}
