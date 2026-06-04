import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import type { ContactsViewId } from '@/lib/contacts-views'
import { STANDARD_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

type ContactsViewSwitcherProps = {
  value: ContactsViewId
  onChange: (view: ContactsViewId) => void
  archivedCount?: number
  className?: string
  showLabel?: boolean
  captionPosition?: 'above' | 'below'
}

export function ContactsViewSwitcher({
  value,
  onChange,
  archivedCount = 0,
  className,
  showLabel = false,
  captionPosition = 'below',
}: ContactsViewSwitcherProps) {
  return (
    <ModuleViewSwitcher
      value={value}
      onChange={onChange}
      options={STANDARD_MODULE_VIEW_OPTIONS}
      tablistAriaLabel="Vista de contactos"
      archivedViewId="archivados"
      archivedCount={archivedCount}
      className={className}
      showLabel={showLabel}
      captionPosition={captionPosition}
    />
  )
}
