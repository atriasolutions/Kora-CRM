import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import {
  CONTACT_LIST_SCOPE_OPTIONS,
  CONTACT_SCOPE_SHORT_LABELS,
  type ContactListScope,
} from '@/lib/contact-list-scope'

type ContactsListScopeSwitcherProps = {
  value: ContactListScope
  onChange: (scope: ContactListScope) => void
  className?: string
  showLabel?: boolean
}

export function ContactsListScopeSwitcher({
  value,
  onChange,
  className,
  showLabel = false,
}: ContactsListScopeSwitcherProps) {
  return (
    <ModuleListScopeSwitcher
      value={value}
      onChange={onChange}
      options={CONTACT_LIST_SCOPE_OPTIONS}
      shortLabels={CONTACT_SCOPE_SHORT_LABELS}
      className={className}
      showLabel={showLabel}
    />
  )
}
