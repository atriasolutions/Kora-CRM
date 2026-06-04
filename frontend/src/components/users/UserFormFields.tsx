import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { profileIdForUserRole } from '@/data/profiles.mock'
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
            onChange={(role) =>
              patch({ role, profileId: profileIdForUserRole(role) })
            }
            options={USER_ROLE_OPTIONS}
          />
          <ContactFormSelect
            id="user-profile"
            label="Perfil de acceso"
            value={form.profileId}
            onChange={(profileId) => patch({ profileId })}
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
