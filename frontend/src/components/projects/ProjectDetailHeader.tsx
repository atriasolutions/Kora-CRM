import {
  Building2,
  Calendar,
  MoreHorizontal,
  Pencil,
  Puzzle,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProjectDetail } from '@/data/project-detail.mock'
import type { ProjectStatus } from '@/data/projects.mock'
import {
  projectHealthVariant,
  projectPriorityVariant,
  projectStatusVariant,
} from '@/lib/project-display'
import {
  PROJECT_HEALTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectFormValues,
} from '@/lib/project-form'
import { journeyStageVariant } from '@/lib/project-journey'
import { RegisterActivityHeaderButton } from '@/components/shared/RegisterActivityHeaderButton'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import type { ProjectWorkMetrics } from '@/types/project-work-plan'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type ProjectDetailHeaderProps = {
  project: ProjectDetail
  workMetrics?: ProjectWorkMetrics
  isEditing?: boolean
  form?: ProjectFormValues
  onFormChange?: (patch: Partial<ProjectFormValues>) => void
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onArchive?: () => void
}

export function ProjectDetailHeader({
  project,
  workMetrics,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onRegisterActivity,
  onArchive,
}: ProjectDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('proyectos', {
    onStartEdit,
    onArchive,
  })

  const displayName = isEditing && form ? form.name : project.name
  const displayJourney = isEditing && form ? form.journeyStage : project.journeyStage
  const displayStatus = isEditing && form ? form.status : project.status
  const displayHealth = isEditing && form ? form.health : project.health
  const displayPriority = isEditing && form ? form.priority : project.priority
  const displayProgressNum = workMetrics
    ? workMetrics.statusProgressPct
    : isEditing && form
      ? Number.parseInt(form.progress.replace(/[^\d]/g, ''), 10) || 0
      : project.progressNum

  const metrics = [
    {
      label: workMetrics ? 'Avance (estado)' : 'Avance',
      value: workMetrics
        ? `${workMetrics.statusProgressPct}%`
        : isEditing && form
          ? form.progress
          : project.progress,
    },
    { label: 'Presupuesto', value: isEditing && form ? form.budget : project.budget },
    { label: 'Entrega', value: isEditing && form ? form.deadline : project.deadline },
    { label: 'Inicio', value: isEditing && form ? form.startDate : project.startDate },
    {
      label: 'Horas',
      value: workMetrics
        ? `${workMetrics.actualHours} / ${workMetrics.estimatedHours}`
        : `${project.hoursLogged} / ${project.hoursEstimated}`,
    },
    {
      label: 'Gerente',
      value: isEditing && form ? form.managerName : project.manager,
    },
  ]

  const patch = (partial: Partial<ProjectFormValues>) => {
    onFormChange?.(partial)
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isEditing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'border-b border-border p-4 sm:p-5 lg:p-6',
          isEditing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-5/10 sm:size-16">
              <Puzzle aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {isEditing && form ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContactFormInput
                    id="pr-header-name"
                    label="Nombre"
                    value={form.name}
                    className="sm:col-span-2"
                    onChange={(name) => patch({ name })}
                  />
                  <ContactFormSelect
                    id="pr-header-status"
                    label="Estado"
                    value={form.status}
                    onChange={(status) => patch({ status: status as ProjectStatus })}
                    options={PROJECT_STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                  <ContactFormSelect
                    id="pr-header-health"
                    label="Salud"
                    value={form.health}
                    onChange={(health) =>
                      patch({ health: health as ProjectFormValues['health'] })
                    }
                    options={PROJECT_HEALTH_OPTIONS.map((h) => ({
                      value: h,
                      label: h,
                    }))}
                  />
                  <ContactFormSelect
                    id="pr-header-priority"
                    label="Prioridad"
                    value={form.priority}
                    onChange={(priority) =>
                      patch({ priority: priority as ProjectFormValues['priority'] })
                    }
                    options={PROJECT_PRIORITY_OPTIONS.map((p) => ({
                      value: p,
                      label: p,
                    }))}
                  />
                  <ContactFormInput
                    id="pr-header-progress"
                    label="Avance (%)"
                    value={form.progress}
                    onChange={(progress) => patch({ progress })}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {displayName}
                    </h1>
                    <Badge variant={journeyStageVariant(displayJourney)}>
                      {displayJourney}
                    </Badge>
                    <Badge variant={projectStatusVariant(displayStatus)} className="hidden sm:inline-flex">
                      {displayStatus}
                    </Badge>
                    <Badge variant={projectHealthVariant(displayHealth)}>
                      {displayHealth}
                    </Badge>
                    <Badge variant={projectPriorityVariant(displayPriority)}>
                      {displayPriority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.client} · Gerente {project.manager}
                  </p>
                  {project.companyId ? (
                    <Link
                      to={`/empresas/${project.companyId}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Building2 aria-hidden className="size-4" />
                      Ver empresa
                    </Link>
                  ) : null}
                  <div className="max-w-md space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progreso general</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {displayProgressNum}%
                      </span>
                    </div>
                    <ProjectProgressBar progressNum={displayProgressNum} />
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
              <RegisterActivityHeaderButton onRegister={onRegisterActivity} />
              {showEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onStartEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  Editar
                </Button>
              ) : null}
              {showArchive ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-border shadow-sm">
                      <MoreHorizontal aria-hidden className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onArchive}
                    >
                      Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {!isEditing ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar aria-hidden className="size-4" />
              Entrega {project.deadline}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden className="size-4" />
              {project.manager}
            </span>
            {project.opportunityId && project.opportunityName ? (
              <Link
                to={`/oportunidades/${project.opportunityId}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                Oportunidad: {project.opportunityName}
              </Link>
            ) : null}
            {project.acceptedQuote ? (
              <Link
                to={`/cotizaciones/${project.acceptedQuote.id}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                Cotización: {project.acceptedQuote.code}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
