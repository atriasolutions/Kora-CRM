import { ChevronRight, Plus, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateOpportunityDialog } from '@/components/opportunities/CreateOpportunityDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isApiEnabled } from '@/api/config'
import { listOpportunitiesForCompanyApi } from '@/api/opportunities'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import {
  createOpportunityInitialFromCompany,
  opportunitiesForCompany,
} from '@/lib/company-opportunities'
import type { CreateOpportunityFormValues } from '@/lib/opportunity-create'
import { opportunityStageVariant } from '@/lib/opportunity-journey'

type CompanyOpportunitiesPanelProps = {
  company: CompanyDetail
  disabled?: boolean
  onCountChange?: (count: number) => void
}

export function CompanyOpportunitiesPanel({
  company,
  disabled = false,
  onCountChange,
}: CompanyOpportunitiesPanelProps) {
  const navigate = useNavigate()
  const { allOpportunities, addOpportunity, reloadFromApi } = useOpportunitiesRegistry()
  const [createOpen, setCreateOpen] = useState(false)
  const [companyOpportunities, setCompanyOpportunities] = useState<
    OpportunityListItem[] | null
  >(null)
  const useApi = isApiEnabled()
  const [loading, setLoading] = useState(useApi)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!useApi) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const items = await listOpportunitiesForCompanyApi(company.id)
        if (!cancelled) setCompanyOpportunities(items)
        await reloadFromApi()
      } catch {
        if (!cancelled) setCompanyOpportunities([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [company.id, reloadFromApi, useApi])

  const related = useMemo(() => {
    if (companyOpportunities !== null) return companyOpportunities
    return opportunitiesForCompany(allOpportunities, {
      id: company.id,
      name: company.name,
    })
  }, [allOpportunities, company.id, company.name, companyOpportunities])

  const createInitial = useMemo(
    () =>
      createOpportunityInitialFromCompany({
        id: company.id,
        name: company.name,
        owner: company.owner,
        ownerDetail: company.ownerDetail,
      }),
    [company.id, company.name, company.owner, company.ownerDetail],
  )

  const companyPreset = useMemo(
    () => ({
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl ?? '',
      industry: company.industry ?? '',
      city: company.city ?? '',
    }),
    [company.id, company.name, company.logoUrl, company.industry, company.city],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  const handleCreate = async (values: CreateOpportunityFormValues) => {
    const item = await addOpportunity(values)
    setCompanyOpportunities((prev) => {
      const base = prev ?? []
      if (base.some((o) => o.id === item.id)) return base
      return [item, ...base]
    })
    navigate(`/oportunidades/${item.id}`)
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Oportunidades</CardTitle>
          <Button
            type="button"
            size="sm"
            className="shadow-sm"
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
          >
            <Plus aria-hidden className="size-4" />
            Nueva oportunidad
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Cargando oportunidades…
            </div>
          ) : related.length === 0 ? (
            <div className="py-8 text-center">
              <Target
                aria-hidden
                className="mx-auto mb-3 size-10 text-muted-foreground"
              />
              <p className="text-sm font-medium text-foreground">
                Sin oportunidades vinculadas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea una oportunidad asociada a {company.name}.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 border-border"
                disabled={disabled}
                onClick={() => setCreateOpen(true)}
              >
                <Plus aria-hidden className="size-4" />
                Crear oportunidad
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {related.map((opp) => (
                <li key={opp.id}>
                  <Link
                    to={`/oportunidades/${opp.id}`}
                    className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                        <Target
                          aria-hidden
                          className="size-4 text-primary"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary">
                          {opp.name}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {opp.company}
                          {opp.contactName && opp.contactName !== '—'
                            ? ` · ${opp.contactName}`
                            : ''}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cierre estimado · {opp.closeDate} · {opp.probability}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      <Badge variant={opportunityStageVariant(opp.stage)}>
                        {opp.stage}
                      </Badge>
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {opp.amount}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateOpportunityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nueva oportunidad"
        description={`Empresa ${company.name} preseleccionada. Puedes cambiarla o elegir el contacto.`}
        initialValues={createInitial}
        presetCompany={companyPreset}
        onSubmit={handleCreate}
      />
    </>
  )
}
