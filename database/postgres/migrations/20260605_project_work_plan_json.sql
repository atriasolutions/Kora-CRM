-- Plan de trabajo (grupos y actividades) persistido como JSON en el proyecto.
ALTER TABLE crm_projects
  ADD COLUMN IF NOT EXISTS work_plan_json JSONB NOT NULL DEFAULT '{"groups":[],"items":[]}'::jsonb;

COMMENT ON COLUMN crm_projects.work_plan_json IS
  'Tablero de trabajo: grupos, actividades, subactividades, horas y fechas.';
