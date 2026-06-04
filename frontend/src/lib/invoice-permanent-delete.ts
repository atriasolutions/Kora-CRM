import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeInvoiceDetailOverride } from '@/lib/invoice-detail-storage'
import { removeInvoiceJourneyOverride } from '@/lib/invoice-journey'

/** Limpia datos locales asociados al registro (no reversible). */
export function purgeInvoiceLocalData(invoiceId: string) {
  const id = invoiceId.trim()
  if (!id) return
  purgeEntityAttachments('factura', id, 'factura')
  removeInvoiceDetailOverride(id)
  removeInvoiceJourneyOverride(id)
}
