import type { ContactDetail } from '@/data/contact-detail.mock'
import { ContactDetailProfile } from '@/components/contacts/ContactDetailProfile'

type ContactDetailSidebarProps = {
  contact: ContactDetail
}

export function ContactDetailSidebar({ contact }: ContactDetailSidebarProps) {
  return <ContactDetailProfile contact={contact} />
}
