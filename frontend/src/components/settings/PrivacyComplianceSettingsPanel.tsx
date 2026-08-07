import { PrivacyLawGuideCard } from '@/components/settings/PrivacyLawGuideCard'
import { PrivacyRequestsPanel } from '@/components/settings/PrivacyRequestsPanel'
import { PrivacySettingsPanel } from '@/components/settings/PrivacySettingsPanel'
import { SecurityIncidentsPanel } from '@/components/settings/SecurityIncidentsPanel'

export function PrivacyComplianceSettingsPanel() {
  return (
    <div className="space-y-4">
      <PrivacyLawGuideCard />
      <PrivacySettingsPanel />
      <PrivacyRequestsPanel />
      <SecurityIncidentsPanel />
    </div>
  )
}
