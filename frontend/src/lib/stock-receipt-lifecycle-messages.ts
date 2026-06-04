import type { StockReceiptListItem, StockReceiptStatus } from '@/data/stock-receipts.mock'

export type StockReceiptLifecycleCopy = {
  title: string
  description: string
  confirmLabel: string
}

export function archiveStockReceiptCopy(
  status: StockReceiptStatus,
  number: string,
  retentionDays: number,
): StockReceiptLifecycleCopy {
  const papelera = `«${number}» pasará a la papelera durante ${retentionDays} días. Podrás restaurarlo desde Archivados.`
  if (status === 'Confirmado') {
    return {
      title: 'Archivar ingreso confirmado',
      description: `${papelera} El stock en bodega no cambia: solo se oculta de la lista. Sigue contando como recibido en la orden de compra vinculada.`,
      confirmLabel: 'Archivar',
    }
  }
  return {
    title: 'Archivar ingreso',
    description: `${papelera} Este ingreso en borrador aún no ha movido inventario.`,
    confirmLabel: 'Archivar',
  }
}

export function bulkArchiveStockReceiptsCopy(
  receipts: Pick<StockReceiptListItem, 'status' | 'number'>[],
  retentionDays: number,
): StockReceiptLifecycleCopy {
  const count = receipts.length
  const confirmedCount = receipts.filter((r) => r.status === 'Confirmado').length
  const draftCount = count - confirmedCount

  let detail =
    `Se archivarán ${count} ingreso(s) durante ${retentionDays} días en la papelera.`
  if (confirmedCount > 0 && draftCount > 0) {
    detail += ` ${confirmedCount} confirmado(s): el stock en bodega no cambia. ${draftCount} en borrador: sin impacto en inventario.`
  } else if (confirmedCount > 0) {
    detail += ' El stock en bodega no cambia; siguen contando en sus órdenes de compra.'
  } else {
    detail += ' Ninguno ha movido inventario (están en borrador).'
  }

  return {
    title: 'Archivar ingresos seleccionados',
    description: detail,
    confirmLabel: 'Archivar',
  }
}

function annulDescriptionForConfirmed(numbers: string[]): string {
  const refs =
    numbers.length === 1
      ? `«${numbers[0]}»`
      : `${numbers.length} ingresos confirmados`
  return `${refs}: se eliminarán de forma permanente. Se restará el stock ingresado en bodega y las cantidades volverán como pendientes en la orden de compra (en tránsito). No uses esta acción si ese stock ya se vendió o comprometió.`
}

function annulDescriptionForDraft(numbers: string[]): string {
  const refs =
    numbers.length === 1
      ? `«${numbers[0]}»`
      : `${numbers.length} ingresos en borrador`
  return `${refs}: se eliminarán de forma permanente. No hay stock que revertir porque nunca se confirmaron.`
}

/** Textos para eliminación definitiva desde la papelera (anulación si estaba confirmado). */
export function annulStockReceiptsCopy(
  receipts: Pick<StockReceiptListItem, 'status' | 'number'>[],
): StockReceiptLifecycleCopy {
  const confirmed = receipts.filter((r) => r.status === 'Confirmado')
  const drafts = receipts.filter((r) => r.status === 'Borrador')

  if (confirmed.length > 0 && drafts.length === 0) {
    return {
      title: receipts.length === 1 ? 'Anular ingreso' : 'Anular ingresos',
      description: annulDescriptionForConfirmed(confirmed.map((r) => r.number)),
      confirmLabel: receipts.length === 1 ? 'Anular ingreso' : 'Anular ingresos',
    }
  }

  if (drafts.length > 0 && confirmed.length === 0) {
    return {
      title: receipts.length === 1 ? 'Eliminar ingreso' : 'Eliminar ingresos',
      description: annulDescriptionForDraft(drafts.map((r) => r.number)),
      confirmLabel: 'Eliminar definitivamente',
    }
  }

  return {
    title: 'Anular y eliminar ingresos',
    description: `${annulDescriptionForConfirmed(confirmed.map((r) => r.number))} ${annulDescriptionForDraft(drafts.map((r) => r.number))}`,
    confirmLabel: 'Confirmar eliminación',
  }
}

export function annulSuccessToast(
  receipts: Pick<StockReceiptListItem, 'status'>[],
): string {
  const count = receipts.length
  const hasConfirmed = receipts.some((r) => r.status === 'Confirmado')
  if (count === 1) {
    return hasConfirmed
      ? 'Ingreso anulado. Se revirtió el stock en bodega.'
      : 'Ingreso eliminado definitivamente.'
  }
  return hasConfirmed
    ? `${count} ingresos anulados. Se revirtió el stock de los confirmados.`
    : `${count} ingresos eliminados definitivamente.`
}
