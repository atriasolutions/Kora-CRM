import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { Input } from '@/components/ui/input'
import { isGuestAccessProfile } from '@/lib/access-profile-admin'
import { resolveProfileIdForRole } from '@/lib/user-form'
import { useProfilesRegistry } from '@/hooks/use-profiles-registry'
import {
  USER_LANGUAGE_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  USER_TEAM_PRESETS,
  USER_TIMEZONE_OPTIONS,
  type UserFormValues,
} from '@/lib/user-form'

type UserFormFieldsProps = {
  form: UserFormValues
  onChange: (patch: Partial<UserFormValues>) => void
  /** En invitación el estado suele quedar en Invitado. */
  showStatus?: boolean
  defaultStatus?: UserFormValues['status']
}

export function UserFormFields({
  form,
  onChange,
  showStatus = true,
  defaultStatus,
}: UserFormFieldsProps) {
  const { listItems: profileOptions } = useProfilesRegistry()
  const patch = (partial: Partial<UserFormValues>) => onChange(partial)
  const selectedProfile = profileOptions.find((p) => p.id === form.profileId)
  const showGuestCompanyLookup = isGuestAccessProfile(selectedProfile)

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Foto de perfil</h3>
        <AvatarImageUpload
          value={form.avatarUrl}
          onChange={(avatarUrl) => patch({ avatarUrl })}
          fallbackLabel={form.name.trim() || form.email || 'Usuario'}
          size="lg"
          uploadLabel="Subir foto"
        />
        <p className="text-xs text-muted-foreground">
          JPG o PNG. Se recorta al centro en cuadrado para que no se deforme en el avatar.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Perfil</h3>
        <ContactFormInput
          id="user-name"
          label="Nombre completo"
          inputVariant="alphanumeric"
          value={form.name}
          onChange={(name) => patch({ name })}
          required
        />
        <ContactFormInput
          id="user-email"
          label="Correo electrónico"
          type="email"
          value={form.email}
          onChange={(email) => patch({ email })}
          required
        />
        <ContactFormInput
          id="user-phone"
          label="Teléfono"
          inputVariant="phone"
          value={form.phone}
          onChange={(phone) => patch({ phone })}
        />
        <ContactFormField label="Fecha de nacimiento" id="user-birth-date">
          <Input
            id="user-birth-date"
            type="date"
            value={form.birthDate}
            max={new Date().toISOString().slice(0, 10)}
            className="h-9 bg-background shadow-sm"
            onChange={(e) => patch({ birthDate: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Opcional. Se usa en la pantalla de bienvenida para cumpleaños del equipo.
          </p>
        </ContactFormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id="user-dept"
            label="Departamento"
            inputVariant="alphanumeric"
            value={form.department}
            onChange={(department) => patch({ department })}
          />
          <ContactFormInput
            id="user-title"
            label="Cargo"
            inputVariant="alphanumeric"
            value={form.jobTitle}
            onChange={(jobTitle) => patch({ jobTitle })}
          />
        </div>
        <ContactFormTextarea
          id="user-bio"
          label="Biografía"
          value={form.bio}
          onChange={(bio) => patch({ bio })}
          rows={3}
          placeholder="Responsabilidades o notas internas…"
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Preferencias</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id="user-timezone"
            label="Zona horaria"
            value={form.timezone}
            onChange={(timezone) => patch({ timezone })}
            options={USER_TIMEZONE_OPTIONS}
          />
          <ContactFormSelect
            id="user-language"
            label="Idioma"
            value={form.language}
            onChange={(language) => patch({ language })}
            options={USER_LANGUAGE_OPTIONS}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Acceso</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id="user-role"
            label="Rol"
            value={form.role}
            onChange={(role) => {
              const profileId = resolveProfileIdForRole(role, profileOptions)
              const nextProfile = profileOptions.find((p) => p.id === profileId)
              const patchValues: Partial<UserFormValues> = { role, profileId }
              if (!isGuestAccessProfile(nextProfile)) {
                patchValues.guestCompanyId = ''
                patchValues.guestCompanyName = ''
              }
              patch(patchValues)
            }}
            options={USER_ROLE_OPTIONS}
          />
          <ContactFormSelect
            id="user-profile"
            label="Perfil de acceso"
            value={form.profileId}
            onChange={(profileId) => {
              const nextProfile = profileOptions.find((p) => p.id === profileId)
              const patchValues: Partial<UserFormValues> = { profileId }
              if (!isGuestAccessProfile(nextProfile)) {
                patchValues.guestCompanyId = ''
                patchValues.guestCompanyName = ''
              }
              patch(patchValues)
            }}
            options={profileOptions.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          {showStatus ? (
            <ContactFormSelect
              id="user-status"
              label="Estado"
              value={form.status}
              onChange={(status) =>
                patch({ status: status as UserFormValues['status'] })
              }
              options={USER_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          ) : (
            <ContactFormField label="Estado" id="user-status-readonly">
              <p
                id="user-status-readonly"
                className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              >
                {defaultStatus ?? 'Invitado'}
              </p>
            </ContactFormField>
          )}
        </div>
        {showGuestCompanyLookup ? (
          <CompanyLookupField
            label="Cliente de la empresa"
            value={form.guestCompanyId}
            onChange={(guestCompanyId, company) =>
              patch({
                guestCompanyId,
                guestCompanyName: company?.name ?? '',
              })
            }
            searchPlaceholder="Buscar empresa del cliente…"
            helperText="Opcional. Las solicitudes creadas por este invitado quedarán asociadas a esta empresa."
            presetCompany={
              form.guestCompanyId && form.guestCompanyName
                ? { id: form.guestCompanyId, name: form.guestCompanyName }
                : undefined
            }
          />
        ) : null}
        <ContactFormSelect
          id="user-2fa"
          label="Autenticación en dos pasos (2FA)"
          value={form.twoFactorEnabled ? 'yes' : 'no'}
          onChange={(v) => patch({ twoFactorEnabled: v === 'yes' })}
          options={[
            { value: 'no', label: 'Desactivado' },
            { value: 'yes', label: 'Requerido al iniciar sesión' },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Si activas la política, el usuario debe vincular Google Authenticator (u app TOTP) en su
          perfil o en el primer inicio de sesión.
        </p>
        <ContactFormInput
          id="user-teams"
          label="Equipos"
          value={form.teamsInput}
          onChange={(teamsInput) => patch({ teamsInput })}
          placeholder="Comercial, Marketing…"
        />
        <p className="text-xs text-muted-foreground">
          Separa varios equipos con coma. Sugerencias:{' '}
          {USER_TEAM_PRESETS.join(', ')}.
        </p>
      </section>
    </div>
  )
}
