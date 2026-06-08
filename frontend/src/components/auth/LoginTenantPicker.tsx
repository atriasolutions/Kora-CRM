import type { TenantMembershipOption } from '@/api/auth'
import { ContactFormSelect } from '@/components/contacts/ContactFormField'
import { resolveOrganizationLogoUrl } from '@/lib/organization-logo'

type LoginTenantPickerProps = {
  memberships: TenantMembershipOption[]
  value: string
  onChange: (tenantId: string) => void
}

export function LoginTenantPicker({
  memberships,
  value,
  onChange,
}: LoginTenantPickerProps) {
  if (memberships.length <= 1) return null

  return (
    <ContactFormSelect
      id="login-tenant"
      label="Empresa"
      value={value}
      onChange={onChange}
      options={memberships.map((m) => ({
        value: m.tenantId,
        label: m.displayName,
      }))}
    />
  )
}

export function LoginTenantLogo({
  displayName,
  logoUrl,
}: {
  displayName: string
  logoUrl?: string
}) {
  const resolved = logoUrl ? resolveOrganizationLogoUrl(logoUrl) : ''
  return (
    <div className="mb-4 flex h-14 items-center justify-center px-2">
      {resolved ? (
        <img
          src={resolved}
          alt={displayName}
          className="max-h-14 max-w-[200px] object-contain"
        />
      ) : (
        <p className="truncate text-center text-sm font-medium text-muted-foreground">
          {displayName}
        </p>
      )}
    </div>
  )
}
