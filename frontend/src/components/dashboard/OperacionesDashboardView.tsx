import { DashboardBarChartCard } from '@/components/dashboard/DashboardBarChartCard'
import { DashboardDonutChartCard } from '@/components/dashboard/DashboardDonutChartCard'
import { DashboardRecordListCard } from '@/components/dashboard/DashboardRecordListCard'
import { DashboardTimeSeriesChartCard } from '@/components/dashboard/DashboardTimeSeriesChartCard'
import { TasksByProjectCard } from '@/components/dashboard/TasksByProjectCard'
import type { DashboardData } from '@/types/dashboard'

const dashboardCardClass =
  'border-border shadow-sm max-sm:rounded-2xl max-sm:shadow-md max-sm:ring-1 max-sm:ring-border/60'

type OperacionesDashboardViewProps = {
  data: DashboardData
}

export function OperacionesDashboardView({ data }: OperacionesDashboardViewProps) {
  return (
    <>
      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-3">
        {data.barChart ? (
          <div className="min-h-0 min-w-0 xl:col-span-2">
            <DashboardBarChartCard
              title={data.barChart.title}
              description={data.barChart.description}
              items={data.barChart.items}
              className={dashboardCardClass}
            />
          </div>
        ) : null}
        {data.timeSeries ? (
          <div className="min-h-0 min-w-0 xl:col-span-1">
            <DashboardTimeSeriesChartCard
              title={data.timeSeries.title}
              description={data.timeSeries.description}
              series={data.timeSeries.series}
              lines={data.timeSeries.lines}
              valueFormatter={(value) => `${value.toLocaleString('es-CL')} h`}
              className={dashboardCardClass}
            />
          </div>
        ) : null}
      </section>

      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
        {data.donutChart ? (
          <DashboardDonutChartCard
            title={data.donutChart.title}
            description={data.donutChart.description}
            slices={data.donutChart.slices}
            centerLabel={data.donutChart.centerLabel}
            valueFormatter={(value) => value.toLocaleString('es-CL')}
            className={dashboardCardClass}
          />
        ) : null}
        {data.listSection ? (
          <DashboardRecordListCard
            title={data.listSection.title}
            description={data.listSection.description}
            items={data.listSection.items}
            className={dashboardCardClass}
          />
        ) : null}
      </section>

      {data.progressSection ? (
        <section className="grid min-w-0 gap-3 sm:gap-4">
          <TasksByProjectCard
            items={data.progressSection.items}
            title={data.progressSection.title}
            description={data.progressSection.description}
            className={dashboardCardClass}
          />
        </section>
      ) : null}
    </>
  )
}
