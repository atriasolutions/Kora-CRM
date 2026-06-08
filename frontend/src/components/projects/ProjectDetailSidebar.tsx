import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ProjectDetail } from '@/data/project-detail.mock'
import type { ProjectHealth, ProjectPriority, ProjectStatus } from '@/data/projects.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  PROJECT_HEALTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectFormValues,
} from '@/lib/project-form'
import { Link } from 'react-router-dom'

import { ProjectRelationsFields } from '@/components/projects/ProjectRelationsFields'
import { quoteStatusVariant } from '@/lib/quote-display'

type ProjectDetailSidebarProps = {
  project: ProjectDetail
  /** Responsables únicos del plan de trabajo (pestaña Equipo / Información). */
  workPlanTeamNames?: string[]
  isEditing?: boolean
  form?: ProjectFormValues
  onFormChange?: (patch: Partial<ProjectFormValues>) => void
}

export function ProjectDetailSidebar({
  project,
  workPlanTeamNames,
  isEditing = false,
  form,
  onFormChange,
}: ProjectDetailSidebarProps) {
  const patch = (partial: Partial<ProjectFormValues>) => {
    onFormChange?.(partial)
  }

  if (isEditing && form) {
    return (
      <aside className="space-y-4">
        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Origen comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectRelationsFields
              values={form}
              onChange={(rel) => patch(rel)}
              idPrefix="edit-pr-rel"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Planificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContactFormInput
              id="edit-pr-start"
              label="Fecha de inicio"
              value={form.startDate}
              onChange={(startDate) => patch({ startDate })}
            />
            <ContactFormInput
              id="edit-pr-budget"
              label="Presupuesto"
              value={form.budget}
              onChange={(budget) => patch({ budget })}
            />
            <ContactFormInput
              id="edit-pr-deadline"
              label="Entrega"
              value={form.deadline}
              onChange={(deadline) => patch({ deadline })}
            />
            <UserLookupField
              label="Gerente"
              value={form.managerName}
              onChange={(managerName) => patch({ managerName })}
            />
            <ContactFormSelect
              id="edit-pr-status"
              label="Estado"
              value={form.status}
              onChange={(status) => patch({ status: status as ProjectStatus })}
              options={PROJECT_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
            <ContactFormSelect
              id="edit-pr-health"
              label="Salud"
              value={form.health}
              onChange={(health) => patch({ health: health as ProjectHealth })}
              options={PROJECT_HEALTH_OPTIONS.map((h) => ({ value: h, label: h }))}
            />
            <ContactFormSelect
              id="edit-pr-priority"
              label="Prioridad"
              value={form.priority}
              onChange={(priority) => patch({ priority: priority as ProjectPriority })}
              options={PROJECT_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Detalle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContactFormInput
              id="edit-pr-client"
              label="Cliente"
              value={form.client}
              onChange={(client) => patch({ client })}
            />
            <ContactFormField id="edit-pr-desc" label="Descripción">
              <textarea
                id="edit-pr-desc"
                rows={4}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </ContactFormField>
          </CardContent>
        </Card>
      </aside>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vínculo CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Cliente: </span>
            <span className="font-medium">{project.client}</span>
          </p>
          {project.companyId ? (
            <p>
              <span className="text-muted-foreground">Empresa: </span>
              <Link
                to={`/empresas/${project.companyId}`}
                className="font-medium text-primary hover:underline"
              >
                Ver ficha
              </Link>
            </p>
          ) : null}
          {project.opportunityId && project.opportunityName ? (
            <p>
              <span className="text-muted-foreground">Oportunidad: </span>
              <Link
                to={`/oportunidades/${project.opportunityId}`}
                className="font-medium text-primary hover:underline"
              >
                {project.opportunityName}
              </Link>
            </p>
          ) : null}
          {project.solicitudId && project.solicitudTitle ? (
            <p>
              <span className="text-muted-foreground">Solicitud: </span>
              <Link
                to={`/solicitudes/${project.solicitudId}`}
                className="font-medium text-primary hover:underline"
              >
                {project.solicitudTitle}
                {project.solicitudCode ? ` (${project.solicitudCode})` : ''}
              </Link>
            </p>
          ) : null}
          {!project.opportunityId && !project.solicitudId ? (
            <p className="text-muted-foreground">Sin origen comercial vinculado.</p>
          ) : null}
          {project.acceptedQuote ? (
            <p>
              <span className="text-muted-foreground">Cotización: </span>
              <Link
                to={`/cotizaciones/${project.acceptedQuote.id}`}
                className="font-medium text-primary hover:underline"
              >
                {project.acceptedQuote.code}
              </Link>
              <span className="ms-1 text-muted-foreground">— {project.acceptedQuote.title}</span>
            </p>
          ) : project.opportunityId ? (
            <p className="text-xs text-muted-foreground">
              Sin cotización de referencia. Puedes vincular la aceptada al editar.
            </p>
          ) : null}
          {project.acceptedQuote ? (
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Estado cotización:</span>
              <Badge variant={quoteStatusVariant(project.acceptedQuote.status)}>
                {project.acceptedQuote.status}
              </Badge>
              <span className="font-medium tabular-nums">{project.acceptedQuote.amount}</span>
            </p>
          ) : null}
          <Separator />
          <p>
            <span className="text-muted-foreground">Gerente: </span>
            <span className="font-medium">{project.manager}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Fechas y presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Inicio: </span>
            {project.startDate}
          </p>
          <p>
            <span className="text-muted-foreground">Entrega: </span>
            {project.deadline}
          </p>
          <p>
            <span className="text-muted-foreground">Presupuesto: </span>
            {project.budget}
          </p>
          <p>
            <span className="text-muted-foreground">Horas: </span>
            {project.hoursLogged} registradas / {project.hoursEstimated} estimadas
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {workPlanTeamNames && workPlanTeamNames.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {workPlanTeamNames.map((name) => (
                <li key={name} className="flex justify-between gap-2">
                  <span className="font-medium">{name}</span>
                  {name === project.manager ? (
                    <span className="text-muted-foreground">Gerente</span>
                  ) : (
                    <span className="text-muted-foreground">Plan de trabajo</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin responsables en el plan de trabajo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
