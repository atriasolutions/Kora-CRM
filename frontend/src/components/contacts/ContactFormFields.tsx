import {
  Briefcase,
  MapPin,
  Share2,
  UserRound,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import {
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { TaxIdentifierFields } from '@/components/shared/TaxIdentifierFields'
import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { RegionCommuneFields } from '@/components/shared/RegionCommuneFields'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  CONTACT_KIND_OPTIONS,
  CONTACT_SOURCE_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  type ContactFormValues,
  type ContactKind,
} from '@/lib/contact-form'
import { CONTACT_TAX_IDENTIFIER_TYPE_OPTIONS } from '@/lib/tax-identifier'
import type { ContactLifecycleStatus } from '@/data/contacts.mock'

type ContactFormFieldsProps = {
  values: ContactFormValues
  onChange: (values: ContactFormValues) => void
  showRutError?: boolean
  /** Alias de showRutError para validación de RUT/DNI al enviar. */
  showIdentifierError?: boolean
  showAvatar?: boolean
  idPrefix?: string
}

export function ContactFormFields({
  values,
  onChange,
  showRutError = false,
  showIdentifierError,
  showAvatar = true,
  idPrefix = 'contact',
}: ContactFormFieldsProps) {
  const identifierFieldError = showIdentifierError ?? showRutError
  const patch = (partial: Partial<ContactFormValues>) => {
    onChange({ ...values, ...partial })
  }

  const setContactKind = (contactKind: ContactKind) => {
    if (contactKind === 'B2C') {
      patch({
        contactKind,
        companyId: '',
        company: '',
        role: '',
      })
      return
    }
    patch({ contactKind })
  }

  const isB2B = values.contactKind === 'B2B'

  const companyPreset = useMemo(() => {
    const name = values.company.trim()
    const id = values.companyId.trim()
    if (!name && !id) return undefined
    return {
      id,
      name: name || 'Empresa vinculada',
      industry: values.industry?.trim() || '',
      city: '',
    }
  }, [values.company, values.companyId, values.industry])

  return (
    <div className="space-y-5">
      {showAvatar ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/10 p-4 sm:flex-row sm:items-start">
          <AvatarImageUpload
            value={values.avatarUrl}
            onChange={(avatarUrl) => patch({ avatarUrl })}
            fallbackLabel={values.name || 'Contacto'}
            uploadLabel="Subir foto"
          />
        </div>
      ) : null}

      <ContactFormSection
        title="Tipo de contacto"
        description="Define si la relación es con una empresa (B2B) o con una persona (B2C)"
        icon={Users}
      >
        <ContactFormSelect
          id={`${idPrefix}-kind`}
          label="Relación comercial *"
          value={values.contactKind}
          onChange={(kind) => setContactKind(kind as ContactKind)}
          options={CONTACT_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </ContactFormSection>

      <ContactFormSection
        title="Identificación"
        description="Datos personales y de contacto directo"
        icon={UserRound}
      >
        <ContactFormInput
          id={`${idPrefix}-name`}
          label="Nombre completo *"
          inputVariant="alphanumeric"
          value={values.name}
          onChange={(name) => patch({ name })}
          placeholder="Ej. Ana García López"
        />
        <TaxIdentifierFields
          idPrefix={idPrefix}
          identifierType={values.identifierType}
          value={values.rut}
          onIdentifierTypeChange={(identifierType) => patch({ identifierType })}
          onValueChange={(rut) => patch({ rut })}
          forceShowError={identifierFieldError}
          rutRange="person"
          typeOptions={CONTACT_TAX_IDENTIFIER_TYPE_OPTIONS}
          entityName="contact"
        />
        <ContactFormSelect
          id={`${idPrefix}-status`}
          label="Estado *"
          value={values.status}
          onChange={(status) =>
            patch({ status: status as ContactLifecycleStatus })
          }
          options={CONTACT_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        />
        <ContactFormInput
          id={`${idPrefix}-email`}
          label="Email"
          inputVariant="email"
          required
          forceShowError={showRutError}
          value={values.email}
          onChange={(email) => patch({ email })}
          placeholder="ana@empresa.com"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-mobile`}
            label="Móvil / WhatsApp"
            inputVariant="phone"
            required
            forceShowError={showRutError}
            value={values.mobilePhone}
            onChange={(mobilePhone) => patch({ mobilePhone })}
            placeholder="+56 9 8765 4321"
          />
          <UserLookupField
            label="Responsable *"
            value={values.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
        </div>
      </ContactFormSection>

      {isB2B ? (
        <ContactFormSection
          title="Empresa y cargo"
          description="Vincula la persona con su organización. El cargo es opcional."
          icon={Briefcase}
        >
          <CompanyLookupField
            value={values.companyId}
            presetCompany={companyPreset}
            onChange={(companyId, company) =>
              patch({
                companyId,
                company: company?.name ?? '',
                industry: company?.industry ?? values.industry,
              })
            }
          />
          <ContactFormInput
            id={`${idPrefix}-role`}
            label="Cargo"
            inputVariant="alphanumeric"
            value={values.role}
            onChange={(role) => patch({ role })}
            placeholder="Ej. Director comercial"
          />
        </ContactFormSection>
      ) : null}

      <ContactFormSection
        title="Ubicación"
        description="Útil para visitas y facturación"
        icon={MapPin}
      >
        <ContactFormInput
          id={`${idPrefix}-street`}
          label="Dirección"
          inputVariant="alphanumeric"
          value={values.streetAddress}
          onChange={(streetAddress) => patch({ streetAddress })}
          placeholder="Av. Apoquindo 3000, of. 502"
        />
        <RegionCommuneFields
          regionId={`${idPrefix}-region`}
          communeId={`${idPrefix}-commune`}
          region={values.region || ''}
          commune={values.commune || ''}
          onPatch={(geo) => patch(geo)}
          onRegionChange={(region) => patch({ region })}
          onCommuneChange={(commune) => patch({ commune })}
        />
      </ContactFormSection>

      <ContactFormSection
        title="Presencia y origen"
        description="Enriquece el perfil comercial"
        icon={Share2}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-linkedin`}
            label="LinkedIn"
            inputVariant="alphanumeric"
            value={values.linkedIn}
            onChange={(linkedIn) => patch({ linkedIn })}
            placeholder="linkedin.com/in/usuario"
          />
          <ContactFormSelect
            id={`${idPrefix}-source`}
            label="Origen del contacto"
            value={values.source || '__none__'}
            onChange={(source) =>
              patch({ source: source === '__none__' ? '' : source })
            }
            options={[
              { value: '__none__', label: 'Sin especificar' },
              ...CONTACT_SOURCE_OPTIONS.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
        <ContactFormTextarea
          id={`${idPrefix}-note`}
          label="Notas"
          value={values.initialNote}
          onChange={(initialNote) => patch({ initialNote })}
          placeholder="Preferencias de contacto, contexto de la relación, próximos pasos…"
          rows={3}
        />
      </ContactFormSection>
    </div>
  )
}
