import { PendingActivitiesCard } from '@/components/dashboard/PendingActivitiesCard'
import { RecentOpportunitiesCard } from '@/components/dashboard/RecentOpportunitiesCard'
import { RevenueBySourceCard } from '@/components/dashboard/RevenueBySourceCard'
import { RevenueExpenseChartCard } from '@/components/dashboard/RevenueExpenseChartCard'
import { SalesFunnelCard } from '@/components/dashboard/SalesFunnelCard'
import { TasksByProjectCard } from '@/components/dashboard/TasksByProjectCard'
import type { DashboardData } from '@/types/dashboard'

const dashboardCardClass =
  'border-border shadow-sm max-sm:rounded-2xl max-sm:shadow-md max-sm:ring-1 max-sm:ring-border/60'

type VentasDashboardViewProps = {
  data: DashboardData
}

export function VentasDashboardView({ data }: VentasDashboardViewProps) {
  return (
    <>
      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-3">
        <div className="min-h-0 min-w-0 xl:col-span-2">
          <RevenueExpenseChartCard
            series={data.revenueExpenseSeries ?? []}
            description={data.chartDescription}
            className={dashboardCardClass}
          />
        </div>
        <div className="min-h-0 min-w-0 xl:col-span-1">
          <SalesFunnelCard
            stages={data.funnelStages ?? []}
            className={dashboardCardClass}
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
        <PendingActivitiesCard
          items={data.pendingActivities ?? []}
          className={dashboardCardClass}
        />
        <RecentOpportunitiesCard
          items={data.recentOpportunities ?? []}
          className={dashboardCardClass}
        />
      </section>

      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
        <RevenueBySourceCard
          slices={data.revenueBySource ?? []}
          className={dashboardCardClass}
        />
        <TasksByProjectCard items={data.tasksByProject ?? []} className={dashboardCardClass} />
      </section>
    </>
  )
}
