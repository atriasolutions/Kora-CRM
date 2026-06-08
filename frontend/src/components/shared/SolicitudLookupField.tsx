import { ClipboardList } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { RegistryEntityLookupField } from '@/components/shared/RegistryEntityLookupField'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import { useSolicitudesRegistry } from '@/hooks/use-solicitudes-registry'

type SolicitudLookupFieldProps = {
  label?: string
  value: string
  solicitudTitle?: string
  solicitudCode?: string
  onChange: (solicitudId: string, solicitud?: SolicitudListItem) => void
  disabled?: boolean
  hideHelper?: boolean
  className?: string
}

export function SolicitudLookupField({
  label = 'Solicitud',
  value,
  solicitudTitle,
  solicitudCode,
  onChange,
  disabled = false,
  hideHelper = false,
  className,
}: SolicitudLookupFieldProps) {
  const { allSolicitudes, reloadFromApi } = useSolicitudesRegistry()

  useEffect(() => {
    if (allSolicitudes.length === 0) {
      void reloadFromApi().catch(() => {})
    }
  }, [allSolicitudes.length, reloadFromApi])

  const rows = useMemo(
    () =>
      allSolicitudes.map((item) => ({
        id: item.id,
        primary: item.title,
        secondary: `${item.code} · ${item.status}`,
      })),
    [allSolicitudes],
  )

  const selected = allSolicitudes.find((item) => item.id === value.trim())
  const displayRows = useMemo(() => {
    if (selected && !rows.some((row) => row.id === selected.id)) {
      return [
        {
          id: selected.id,
          primary: selected.title,
          secondary: `${selected.code} · ${selected.status}`,
        },
        ...rows,
      ]
    }
    if (
      value.trim() &&
      solicitudTitle?.trim() &&
      !rows.some((row) => row.id === value.trim())
    ) {
      return [
        {
          id: value.trim(),
          primary: solicitudTitle,
          secondary: solicitudCode ?? '',
        },
        ...rows,
      ]
    }
    return rows
  }, [rows, selected, solicitudCode, solicitudTitle, value])

  return (
    <RegistryEntityLookupField
      label={label}
      value={value}
      rows={displayRows}
      Icon={ClipboardList}
      placeholder="Buscar solicitud por título o código…"
      disabled={disabled}
      className={className}
      detailPath={(id) => `/solicitudes/${id}`}
      onChange={(id) => {
        const solicitud = allSolicitudes.find((item) => item.id === id)
        onChange(id, solicitud)
      }}
      emptyMessage={
        hideHelper ? 'Sin resultados' : 'Sin solicitudes. Crea una en el módulo Solicitudes.'
      }
    />
  )
}
