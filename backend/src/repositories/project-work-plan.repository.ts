import {
  normalizeWorkPlanJson,
  type ProjectWorkPlanJson,
} from '../lib/project-work-plan-json.js'
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
): Promise<ProjectWorkPlanJson> {
  const normalized = normalizeWorkPlanJson(plan)
  const result = await pool.query<{ work_plan_json: unknown }>(
    `UPDATE crm_projects SET
      work_plan_json = $2::jsonb,
      updated_by_id = $3,
      updated_by_name = $4,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING work_plan_json`,
    [projectId, JSON.stringify(normalized), actor.userId, actor.userName],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado')
  return normalizeWorkPlanJson(row.work_plan_json)
}
