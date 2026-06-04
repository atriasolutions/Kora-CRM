import { Briefcase, FileText, Truck, Warehouse } from 'lucide-react'
import { useMemo } from 'react'

import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { ContactLookupField } from '@/components/shared/ContactLookupField'
import { OpportunityLookupField } from '@/components/shared/OpportunityLookupField'
import { ProductLookupField } from '@/components/shared/ProductLookupField'
import { PurchaseLookupField } from '@/components/shared/PurchaseLookupField'
import {
  RegistryEntityLookupField,
  type RegistryLookupRow,
} from '@/components/shared/RegistryEntityLookupField'
import { QuoteLookupField } from '@/components/shared/QuoteLookupField'
import type { ActivityRelatedType } from '@/data/activities.mock'
import { useInventoryRegistry } from '@/hooks/use-inventory-registry'
import { useInvoicesRegistry } from '@/hooks/use-invoices-registry'
import { useProjectsRegistry } from '@/hooks/use-projects-registry'
import { useStockReceiptsRegistry } from '@/hooks/use-stock-receipts-registry'
import { activityRelatedLabel } from '@/lib/activity-display'
import {
  findInventoryRowById,
  inventoryActivityLinkId,
  searchInventoryRows,
} from '@/lib/inventory-row-lookup'
import { findInvoiceById } from '@/lib/invoice-lookup'
import { findProjectById } from '@/lib/project-lookup'
import { findStockReceiptById } from '@/lib/stock-receipt-lookup'

export type ActivityRelatedSelection = {
  relatedId: string
  relatedName: string
  companyName: string
}

type ActivityRelatedLookupFieldProps = {
  relatedType: ActivityRelatedType
  relatedId: string
  relatedName?: string
  onChange: (selection: ActivityRelatedSelection) => void
  disabled?: boolean
}

function ContactoBranch({
  relatedId,
  relatedName,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType'>) {
  return (
    <ContactLookupField
      label="Registro"
      value={relatedId}
      contactName={relatedName}
      disabled={disabled}
      onChange={(id, contact) =>
        onChange({
          relatedId: id,
          relatedName: contact?.name ?? '',
          companyName: contact?.company ?? '',
        })
      }
    />
  )
}

function EmpresaBranch({
  relatedId,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType' | 'relatedName'>) {
  return (
    <CompanyLookupField
      label="Registro"
      value={relatedId}
      disabled={disabled}
      onChange={(id, company) =>
        onChange({
          relatedId: id,
          relatedName: company?.name ?? '',
          companyName: company?.name ?? '',
        })
      }
    />
  )
}

function OportunidadBranch({
  relatedId,
  relatedName,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType'>) {
  return (
    <OpportunityLookupField
      label="Registro"
      value={relatedId}
      opportunityName={relatedName}
      disabled={disabled}
      onChange={(id, opp) =>
        onChange({
          relatedId: id,
          relatedName: opp?.name ?? '',
          companyName: opp?.company ?? '',
        })
      }
    />
  )
}

function CotizacionBranch({
  relatedId,
  relatedName,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType'>) {
  return (
    <QuoteLookupField
      label="Registro"
      value={relatedId}
      quoteCode={relatedName}
      disabled={disabled}
      onChange={(id, quote) =>
        onChange({
          relatedId: id,
          relatedName: quote?.code ?? quote?.title ?? '',
          companyName: quote?.companyName ?? '',
        })
      }
    />
  )
}

function CompraBranch({
  relatedId,
  relatedName,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType'>) {
  return (
    <PurchaseLookupField
      label="Registro"
      value={relatedId}
      purchaseReference={relatedName}
      disabled={disabled}
      onChange={(id, purchase) =>
        onChange({
          relatedId: id,
          relatedName: purchase?.reference ?? '',
          companyName: purchase?.supplier ?? '',
        })
      }
    />
  )
}

function ProductoBranch({
  relatedId,
  relatedName,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType'>) {
  return (
    <ProductLookupField
      label="Registro"
      value={relatedId}
      productName={relatedName}
      disabled={disabled}
      onChange={(id, product) =>
        onChange({
          relatedId: id,
          relatedName: product?.name ?? '',
          companyName: product?.category ?? '',
        })
      }
    />
  )
}

function FacturaBranch({
  relatedId,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType' | 'relatedName'>) {
  const { allInvoices } = useInvoicesRegistry()
  const rows = useMemo<RegistryLookupRow[]>(
    () =>
      allInvoices.map((i) => ({
        id: i.id,
        primary: i.number,
        secondary: `${i.client} · ${i.status}`,
      })),
    [allInvoices],
  )
  const selected = findInvoiceById(allInvoices, relatedId)
  const displayRows = useMemo(() => {
    if (selected && !rows.some((r) => r.id === selected.id)) {
      return [
        {
          id: selected.id,
          primary: selected.number,
          secondary: `${selected.client} · ${selected.status}`,
        },
        ...rows,
      ]
    }
    return rows
  }, [rows, selected])

  return (
    <RegistryEntityLookupField
      label="Registro"
      value={relatedId}
      rows={displayRows}
      Icon={FileText}
      placeholder="Buscar factura por folio o cliente…"
      disabled={disabled}
      detailPath={(id) => `/facturacion/${id}`}
      onChange={(id, row) => {
        const inv = findInvoiceById(allInvoices, id)
        onChange({
          relatedId: id,
          relatedName: inv?.number ?? row?.primary ?? '',
          companyName: inv?.client ?? inv?.companyName ?? '',
        })
      }}
    />
  )
}

function ProyectoBranch({
  relatedId,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType' | 'relatedName'>) {
  const { userProjects } = useProjectsRegistry()
  const rows = useMemo<RegistryLookupRow[]>(
    () =>
      userProjects.map((p) => ({
        id: p.id,
        primary: p.name,
        secondary: `${p.client} · ${p.status}`,
      })),
    [userProjects],
  )
  const selected = findProjectById(userProjects, relatedId)

  const displayRows = useMemo(() => {
    if (selected && !rows.some((r) => r.id === selected.id)) {
      return [
        {
          id: selected.id,
          primary: selected.name,
          secondary: `${selected.client} · ${selected.status}`,
        },
        ...rows,
      ]
    }
    return rows
  }, [rows, selected])

  return (
    <RegistryEntityLookupField
      label="Registro"
      value={relatedId}
      rows={displayRows}
      Icon={Briefcase}
      placeholder="Buscar proyecto por nombre o cliente…"
      disabled={disabled}
      detailPath={(id) => `/proyectos/${id}`}
      onChange={(id) => {
        const project = findProjectById(userProjects, id)
        onChange({
          relatedId: id,
          relatedName: project?.name ?? '',
          companyName: project?.client ?? '',
        })
      }}
    />
  )
}

function IngresoBranch({
  relatedId,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType' | 'relatedName'>) {
  const { allReceipts } = useStockReceiptsRegistry()
  const rows = useMemo<RegistryLookupRow[]>(
    () =>
      allReceipts.map((r) => ({
        id: r.id,
        primary: r.number,
        secondary: [r.supplier, r.status].filter(Boolean).join(' · '),
      })),
    [allReceipts],
  )
  const selected = findStockReceiptById(allReceipts, relatedId)

  const displayRows = useMemo(() => {
    if (selected && !rows.some((r) => r.id === selected.id)) {
      return [
        {
          id: selected.id,
          primary: selected.number,
          secondary: `${selected.supplier} · ${selected.status}`,
        },
        ...rows,
      ]
    }
    return rows
  }, [rows, selected])

  return (
    <RegistryEntityLookupField
      label="Registro"
      value={relatedId}
      rows={displayRows}
      Icon={Truck}
      placeholder="Buscar ingreso por número o proveedor…"
      disabled={disabled}
      detailPath={(id) => `/ingresos/${id}`}
      onChange={(id) => {
        const receipt = findStockReceiptById(allReceipts, id)
        onChange({
          relatedId: id,
          relatedName: receipt?.number ?? '',
          companyName: receipt?.supplier ?? '',
        })
      }}
    />
  )
}

function InventarioBranch({
  relatedId,
  relatedName,
  onChange,
  disabled,
}: Omit<ActivityRelatedLookupFieldProps, 'relatedType'>) {
  const { allInventory } = useInventoryRegistry()
  const searchable = useMemo(() => searchInventoryRows(allInventory, '', 200), [allInventory])
  const rows = useMemo<RegistryLookupRow[]>(
    () =>
      searchable.map((row) => ({
        id: inventoryActivityLinkId(row),
        primary: row.productName,
        secondary: `${row.sku} · ${row.location}`,
      })),
    [searchable],
  )
  const selected = findInventoryRowById(allInventory, relatedId)
  const linkId = selected ? inventoryActivityLinkId(selected) : relatedId

  const displayRows = useMemo(() => {
    if (selected) {
      const id = inventoryActivityLinkId(selected)
      if (!rows.some((r) => r.id === id)) {
        return [
          {
            id,
            primary: selected.productName,
            secondary: `${selected.sku} · ${selected.location}`,
          },
          ...rows,
        ]
      }
    }
    return rows
  }, [rows, selected])

  return (
    <RegistryEntityLookupField
      label="Registro"
      value={linkId}
      rows={displayRows}
      Icon={Warehouse}
      placeholder="Buscar producto por nombre o SKU…"
      disabled={disabled}
      detailPath={(id) => `/inventario/${id}`}
      onChange={(id) => {
        const row = findInventoryRowById(allInventory, id)
        onChange({
          relatedId: id,
          relatedName: row?.productName ?? relatedName ?? '',
          companyName: row?.sku ?? '',
        })
      }}
    />
  )
}

export function ActivityRelatedLookupField({
  relatedType,
  relatedId,
  relatedName,
  onChange,
  disabled,
}: ActivityRelatedLookupFieldProps) {
  const label = activityRelatedLabel(relatedType)

  switch (relatedType) {
    case 'contacto':
      return (
        <ContactoBranch
          relatedId={relatedId}
          relatedName={relatedName}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'empresa':
      return (
        <EmpresaBranch relatedId={relatedId} onChange={onChange} disabled={disabled} />
      )
    case 'oportunidad':
      return (
        <OportunidadBranch
          relatedId={relatedId}
          relatedName={relatedName}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'cotizacion':
      return (
        <CotizacionBranch
          relatedId={relatedId}
          relatedName={relatedName}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'compra':
      return (
        <CompraBranch
          relatedId={relatedId}
          relatedName={relatedName}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'factura':
      return (
        <FacturaBranch relatedId={relatedId} onChange={onChange} disabled={disabled} />
      )
    case 'proyecto':
      return (
        <ProyectoBranch relatedId={relatedId} onChange={onChange} disabled={disabled} />
      )
    case 'ingreso':
      return (
        <IngresoBranch relatedId={relatedId} onChange={onChange} disabled={disabled} />
      )
    case 'producto':
      return (
        <ProductoBranch
          relatedId={relatedId}
          relatedName={relatedName}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'inventario':
      return (
        <InventarioBranch
          relatedId={relatedId}
          relatedName={relatedName}
          onChange={onChange}
          disabled={disabled}
        />
      )
    default:
      return (
        <RegistryEntityLookupField
          label={label}
          value={relatedId}
          rows={[]}
          disabled={disabled}
          detailPath={() => '#'}
          onChange={(id) =>
            onChange({ relatedId: id, relatedName: relatedName ?? '', companyName: '' })
          }
        />
      )
  }
}
