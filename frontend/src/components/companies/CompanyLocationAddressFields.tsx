import { useMemo } from 'react'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { RegionCommuneFields } from '@/components/shared/RegionCommuneFields'
import {
  DEFAULT_COUNTRY,
  countrySelectOptions,
  isChileCountry,
  normalizeCountryValue,
} from '@/lib/location-country'
import type { CompanyLocationFieldValues } from '@/lib/company-location-form'

type CompanyLocationAddressFieldsProps = {
  values: CompanyLocationFieldValues
  onChange: (values: CompanyLocationFieldValues) => void
  idPrefix: string
  streetLabel?: string
}

export function CompanyLocationAddressFields({
  values,
  onChange,
  idPrefix,
  streetLabel = 'Dirección',
}: CompanyLocationAddressFieldsProps) {
  const patch = (partial: Partial<CompanyLocationFieldValues>) => {
    const next = { ...values, ...partial }
    const chileLocation = isChileCountry(next.country)
    const commune =
      partial.commune !== undefined ? partial.commune.trim() : next.commune.trim()
    if (chileLocation && commune) next.city = commune
    onChange(next)
  }

  const chileLocation = isChileCountry(values.country)
  const countryOptions = useMemo(
    () => countrySelectOptions(values.country),
    [values.country],
  )
  const selectedCountry = values.country.trim() || DEFAULT_COUNTRY

  const handleCountryChange = (country: string) => {
    const normalizedCountry = normalizeCountryValue(country)
    const nextIsChile = isChileCountry(normalizedCountry)
    if (nextIsChile === chileLocation) {
      patch({ country: normalizedCountry })
      return
    }
    if (nextIsChile) {
      patch({
        country: normalizedCountry,
        region: '',
        commune: '',
        city: values.city,
      })
      return
    }
    patch({
      country: normalizedCountry,
      region: values.region,
      commune: values.commune || values.city,
      city: values.city || values.commune,
    })
  }

  return (
    <div className="space-y-4">
      <ContactFormInput
        id={`${idPrefix}-street`}
        label={streetLabel}
        inputVariant="alphanumeric"
        value={values.street}
        onChange={(street) => patch({ street })}
        placeholder="Av. Principal 100"
      />
      <ContactFormSelect
        id={`${idPrefix}-country`}
        label="País"
        value={selectedCountry}
        onChange={handleCountryChange}
        options={countryOptions}
      />
      {chileLocation ? (
        <>
          <RegionCommuneFields
            regionId={`${idPrefix}-region`}
            communeId={`${idPrefix}-commune`}
            region={values.region || ''}
            commune={values.commune || ''}
            onPatch={({ region, commune }) =>
              patch({
                region,
                commune,
                city: commune || values.city,
              })
            }
            onRegionChange={(region) => patch({ region })}
            onCommuneChange={(commune) => patch({ commune, city: commune || values.city })}
          />
          {values.commune ? (
            <p className="text-sm text-muted-foreground">
              Ciudad: <span className="font-medium text-foreground">{values.city}</span>
              <span className="text-xs"> (según comuna seleccionada)</span>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Para proveedores fuera de Chile, completa región y localidad con texto libre (estado,
            provincia, municipio, etc.).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id={`${idPrefix}-region-intl`}
              label="Región / Estado / Provincia"
              inputVariant="alphanumeric"
              value={values.region}
              onChange={(region) => patch({ region })}
              placeholder="Ej. CDMX, Cundinamarca, Buenos Aires"
            />
            <ContactFormInput
              id={`${idPrefix}-commune-intl`}
              label="Comuna / Municipio / Localidad"
              inputVariant="alphanumeric"
              value={values.commune}
              onChange={(commune) => patch({ commune, city: values.city || commune })}
              placeholder="Ej. Cuauhtémoc, Medellín"
            />
          </div>
          <ContactFormInput
            id={`${idPrefix}-city`}
            label="Ciudad"
            inputVariant="alphanumeric"
            value={values.city}
            onChange={(city) => patch({ city })}
            placeholder="Ej. Ciudad de México, Lima, Bogotá"
          />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFormInput
          id={`${idPrefix}-postal`}
          label="Código postal"
          inputVariant="alphanumeric"
          value={values.postalCode}
          onChange={(postalCode) => patch({ postalCode })}
        />
      </div>
    </div>
  )
}
