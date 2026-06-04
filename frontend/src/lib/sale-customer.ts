export type SaleCustomerKind = 'contacto' | 'empresa'

export type SaleCustomerValues = {
  customerKind: SaleCustomerKind
  contactId: string
  contactName: string
  companyId: string
  companyName: string
}

export function defaultSaleCustomerValues(
  partial?: Partial<SaleCustomerValues>,
): SaleCustomerValues {
  return {
    customerKind: 'empresa',
    contactId: '',
    contactName: '',
    companyId: '',
    companyName: '',
    ...partial,
  }
}

export function saleCustomerDisplayName(values: SaleCustomerValues): string {
  if (values.customerKind === 'contacto') {
    return values.contactName.trim() || 'Contacto sin nombre'
  }
  return values.companyName.trim() || 'Empresa sin nombre'
}

export function validateSaleCustomer(values: SaleCustomerValues): string | null {
  if (values.customerKind === 'contacto') {
    if (!values.contactId.trim()) return 'Selecciona un contacto (cliente B2C).'
    return null
  }
  if (!values.companyId.trim()) return 'Selecciona una empresa (cliente B2B).'
  return null
}

export function saleCustomerFromCompany(
  companyId: string,
  companyName: string,
): SaleCustomerValues {
  return {
    customerKind: 'empresa',
    contactId: '',
    contactName: '',
    companyId,
    companyName,
  }
}

export function saleCustomerFromContact(
  contactId: string,
  contactName: string,
  companyId = '',
  companyName = '',
): SaleCustomerValues {
  return {
    customerKind: 'contacto',
    contactId,
    contactName,
    companyId,
    companyName,
  }
}

/** Cliente comercial copiado desde la oportunidad (usa su B2B/B2C explícito). */
export function saleCustomerFromOpportunity(opp: {
  customerKind?: SaleCustomerKind
  companyId?: string
  company: string
  contactId?: string
  contactName: string
}): SaleCustomerValues {
  const kind =
    opp.customerKind === 'contacto' || opp.customerKind === 'empresa'
      ? opp.customerKind
      : opp.companyId?.trim()
        ? 'empresa'
        : 'contacto'

  if (kind === 'contacto') {
    return saleCustomerFromContact(
      opp.contactId?.trim() ?? '',
      opp.contactName.trim(),
    )
  }

  return {
    customerKind: 'empresa',
    companyId: opp.companyId ?? '',
    companyName: opp.company.trim(),
    contactId: opp.contactId?.trim() ?? '',
    contactName: opp.contactName.trim(),
  }
}
