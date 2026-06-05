import {
  normalizeWorkPlanJson,
  type ProjectWorkPlanJson,
} from '../lib/project-work-plan-json.js'
import { computeWorkPlanProgressPct } from '../lib/project-work-plan-progress.js'
import { notifyNewWorkItemAssignees } from '../lib/project-work-plan-notify.js'
import { syncNewAssigneesToProjectTeam } from '../lib/project-team-member-sync.js'
import { pool } from '../db/pool.js'
import { notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'

export async function getProjectWorkPlan(
  projectId: string,
): Promise<ProjectWorkPlanJson> {
  const result = await pool.query<{ work_plan_json: unknown }>(
    `SELECT work_plan_json
     FROM crm_projects
     WHERE id = $1 AND deleted_at IS NULL`,
    [projectId],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado')
  return normalizeWorkPlanJson(row.work_plan_json)
}

export async function saveProjectWorkPlan(
  projectId: string,
  plan: ProjectWorkPlanJson,
  actor: AuditActor,
  options?: { skipAssigneeNotify?: boolean },
): Promise<ProjectWorkPlanJson> {
  const previousRow = await pool.query<{
    work_plan_json: unknown
    name: string
    manager_name: string | null
  }>(
    `SELECT work_plan_json, name, manager_name
     FROM crm_projects
     WHERE id = $1 AND deleted_at IS NULL`,
    [projectId],
  )
  const previous = previousRow.rows[0]
  if (!previous) throw notFound('Proyecto no encontrado')

  const previousPlan = normalizeWorkPlanJson(previous.work_plan_json)
  const normalized = normalizeWorkPlanJson(plan)
  const progressPct = computeWorkPlanProgressPct(normalized)
  const result = await pool.query<{ work_plan_json: unknown }>(
    `UPDATE crm_projects SET
      work_plan_json = $2::jsonb,
      progress_pct = $5,
      updated_by_id = $3,
      updated_by_name = $4,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING work_plan_json`,
    [projectId, JSON.stringify(normalized), actor.userId, actor.userName, progressPct],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado')

  if (!options?.skipAssigneeNotify) {
    notifyNewWorkItemAssignees({
      actor,
      projectId,
      projectName: previous.name,
      previousPlan: previous.work_plan_json,
      nextPlan: normalized,
    })
  }

  try {
    await syncNewAssigneesToProjectTeam(
      projectId,
      previous.manager_name?.trim() || '',
      previousPlan,
      normalized,
    )
  } catch {
    /* ignore team sync errors */
  }

  return normalizeWorkPlanJson(row.work_plan_json)
}
