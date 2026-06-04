import { useMemo } from 'react'

import { Building2, MapPin } from 'lucide-react'
import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { CompanyLocationAddressFields } from '@/components/companies/CompanyLocationAddressFields'
import { CompanyTaxIdentifierFields } from '@/components/companies/CompanyTaxIdentifierFields'
import type { CompanyLifecycleStatus, CompanyOperationalStatus } from '@/data/companies.mock'
import {
  COMPANY_LIFECYCLE_OPTIONS,
  type CompanyFormValues,
} from '@/lib/company-form'
import { UserLookupField } from '@/components/shared/UserLookupField'

type CompanyFormFieldsProps = {
  values: CompanyFormValues
  onChange: (values: CompanyFormValues) => void
  showAvatar?: boolean
  showIdentifierError?: boolean
  idPrefix?: string
}

export function CompanyFormFields({
  values,
  onChange,
  showAvatar = true,
  showIdentifierError = false,
  idPrefix = 'company',
}: CompanyFormFieldsProps) {
  const patch = (partial: Partial<CompanyFormValues>) => {
    onChange({ ...values, ...partial })
  }

  const locationValues = useMemo(
    () => ({
      street: values.headquartersStreet,
      country: values.headquartersCountry,
      region: values.headquartersRegion,
      commune: values.headquartersCommune,
      city: values.city,
      postalCode: values.headquartersPostalCode,
    }),
    [
      values.headquartersStreet,
      values.headquartersCountry,
      values.headquartersRegion,
      values.headquartersCommune,
      values.city,
      values.headquartersPostalCode,
    ],
  )

  return (
    <div className="space-y-5">
      {showAvatar ? (
        <AvatarImageUpload
          value={values.logoUrl}
          onChange={(logoUrl) => patch({ logoUrl })}
          fallbackLabel={values.name || 'Empresa'}
          shape="rounded"
          uploadLabel="Subir logo"
        />
      ) : null}

      <ContactFormSection title="Identificación" icon={Building2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-name`}
            label="Nombre de la empresa"
            inputVariant="alphanumeric"
            value={values.name}
            onChange={(name) => patch({ name })}
          />
        </div>
        <CompanyTaxIdentifierFields
          idPrefix={idPrefix}
          identifierType={values.identifierType}
          value={values.rut}
          onIdentifierTypeChange={(identifierType) => patch({ identifierType })}
          onValueChange={(rut) => patch({ rut })}
          forceShowError={showIdentifierError}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id={`${idPrefix}-lifecycle`}
            label="Etapa"
            value={values.lifecycle}
            onChange={(lifecycle) =>
              patch({ lifecycle: lifecycle as CompanyLifecycleStatus })
            }
            options={COMPANY_LIFECYCLE_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <ContactFormSelect
            id={`${idPrefix}-operational`}
            label="Estado de cuenta"
            value={values.operationalStatus}
            onChange={(operationalStatus) =>
              patch({
                operationalStatus: operationalStatus as CompanyOperationalStatus,
              })
            }
            options={[
              { value: 'Activa', label: 'Activa' },
              { value: 'Inactiva', label: 'Inactiva' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-industry`}
            label="Industria"
            inputVariant="alphanumeric"
            value={values.industry}
            onChange={(industry) => patch({ industry })}
          />
          <ContactFormInput
            id={`${idPrefix}-employees`}
            label="Empleados"
            inputVariant="integer"
            value={values.employees}
            onChange={(employees) => patch({ employees })}
            placeholder="120"
          />
        </div>
        <ContactFormInput
          id={`${idPrefix}-description`}
          label="Descripción"
          value={values.description}
          onChange={(description) => patch({ description })}
        />
      </ContactFormSection>

      <ContactFormSection title="Ubicación" icon={MapPin}>
        <CompanyLocationAddressFields
          idPrefix={`${idPrefix}-hq`}
          streetLabel="Dirección casa matriz"
          values={locationValues}
          onChange={(location) =>
            patch({
              headquartersStreet: location.street,
              headquartersCountry: location.country,
              headquartersRegion: location.region,
              headquartersCommune: location.commune,
              city: location.city,
              headquartersPostalCode: location.postalCode,
            })
          }
        />
      </ContactFormSection>

      <ContactFormSection title="Contacto y responsable" icon={Building2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-website`}
            label="Sitio web"
            value={values.website}
            onChange={(website) => patch({ website })}
            placeholder="https://…"
          />
          <ContactFormInput
            id={`${idPrefix}-email`}
            label="Email"
            inputVariant="email"
            value={values.email}
            onChange={(email) => patch({ email })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-phone`}
            label="Teléfono"
            inputVariant="phone"
            value={values.phone}
            onChange={(phone) => patch({ phone })}
          />
          <UserLookupField
            label="Responsable"
            value={values.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
        </div>
      </ContactFormSection>
    </div>
  )
}
