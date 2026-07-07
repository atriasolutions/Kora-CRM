import { PrivacyRequestsPanel } from '@/components/settings/PrivacyRequestsPanel'
import { PrivacySettingsPanel } from '@/components/settings/PrivacySettingsPanel'
import { SecurityIncidentsPanel } from '@/components/settings/SecurityIncidentsPanel'

export function PrivacyComplianceSettingsPanel() {
  return (
    <div className="space-y-4">
      <PrivacySettingsPanel />
      <PrivacyRequestsPanel />
      <SecurityIncidentsPanel />
    </div>
  )
}
