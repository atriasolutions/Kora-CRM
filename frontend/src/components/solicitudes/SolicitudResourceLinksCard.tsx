import { ExternalLink } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { companyWebsiteHref } from '@/lib/company-display'

function ResourceLinkRow({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  const trimmed = value?.trim() ?? ''
  const href = companyWebsiteHref(trimmed)

  return (
    <div className="space-y-1.5 border-b border-border/60 py-3 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {href ? (
        <a
          href={href}
          title={trimmed}
          className="group inline-flex w-full items-start gap-2 text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="min-w-0 flex-1 break-all leading-relaxed">{trimmed}</span>
          <ExternalLink
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 opacity-50 group-hover:opacity-100"
          />
        </a>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">—</span>
      )}
    </div>
  )
}

type SolicitudResourceLinksCardProps = {
  documentationUrl?: string
  gitBranchUrl?: string
}

export function SolicitudResourceLinksCard({
  documentationUrl,
  gitBranchUrl,
}: SolicitudResourceLinksCardProps) {
  const hasDocumentation = Boolean(documentationUrl?.trim())
  const hasGitBranch = Boolean(gitBranchUrl?.trim())

  if (!hasDocumentation && !hasGitBranch) return null

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Enlaces</CardTitle>
      </CardHeader>
      <CardContent>
        <ResourceLinkRow label="Documentación" value={documentationUrl} />
        <ResourceLinkRow label="Rama Git" value={gitBranchUrl} />
      </CardContent>
    </Card>
  )
}
