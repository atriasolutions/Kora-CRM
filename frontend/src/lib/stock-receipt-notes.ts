import type { ContactNote } from '@/data/contact-detail.mock'

/** Convierte notas legadas (texto plano en storage) al formato del panel de notas. */
export function stockReceiptNotesFromStorage(
  stored: ContactNote[] | string | undefined,
  owner: string,
  receiptId: string,
): ContactNote[] {
  if (Array.isArray(stored)) return stored
  if (typeof stored === 'string' && stored.trim()) {
    return [
      {
        id: `${receiptId}-legacy-note`,
        body: `<p>${stored.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
        author: owner,
        when: 'Nota anterior',
      },
    ]
  }
  return []
}

export function defaultStockReceiptNotes(
  receiptId: string,
  owner: string,
): ContactNote[] {
  return [
    {
      id: `${receiptId}-note-1`,
      body: '<p>Revisar cantidades y SKU antes de confirmar el ingreso en bodega.</p>',
      author: owner,
      when: 'Al crear',
    },
  ]
}
