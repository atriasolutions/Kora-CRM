import { useMemo } from 'react'

import { ContactFormSelect } from '@/components/contacts/ContactFormField'
import { useChileLocations } from '@/hooks/use-chile-locations'
import { cn } from '@/lib/utils'

type RegionCommuneFieldsProps = {
  regionId: string
  communeId: string
  region: string
  commune: string
  onRegionChange: (region: string) => void
  onCommuneChange: (commune: string) => void
  /** Al cambiar región, limpia comuna si ya no aplica */
  onPatch?: (patch: { region: string; commune: string }) => void
  className?: string
  disabled?: boolean
}

export function RegionCommuneFields({
  regionId,
  communeId,
  region,
  commune,
  onRegionChange,
  onCommuneChange,
  onPatch,
  className,
  disabled = false,
}: RegionCommuneFieldsProps) {
  const { regions, getCommunesForRegion, loading } = useChileLocations()

  const regionOptions = useMemo(
    () => [
      { value: '', label: loading ? 'Cargando regiones…' : 'Seleccionar región' },
      ...regions.map((r) => ({ value: r, label: r })),
    ],
    [loading, regions],
  )

  const communeOptions = useMemo(() => {
    if (!region.trim()) {
      return [{ value: '', label: 'Selecciona una región primero' }]
    }
    const communes = getCommunesForRegion(region)
    if (communes.length === 0) {
      return [{ value: '', label: 'Sin comunas para esta región' }]
    }
    return [
      { value: '', label: 'Seleccionar comuna' },
      ...communes.map((c) => ({ value: c, label: c })),
    ]
  }, [getCommunesForRegion, region])

  const handleRegionChange = (nextRegion: string) => {
    const validCommunes = getCommunesForRegion(nextRegion)
    const nextCommune =
      commune && validCommunes.includes(commune) ? commune : ''
    if (onPatch) {
      onPatch({ region: nextRegion, commune: nextCommune })
      return
    }
    onRegionChange(nextRegion)
    onCommuneChange(nextCommune)
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      <ContactFormSelect
        id={regionId}
        label="Región"
        value={region}
        disabled={disabled || loading}
        onChange={handleRegionChange}
        options={regionOptions}
      />
      <ContactFormSelect
        id={communeId}
        label="Comuna"
        value={commune}
        disabled={disabled || loading || !region.trim()}
        onChange={onCommuneChange}
        options={communeOptions}
      />
    </div>
  )
}
