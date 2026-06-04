-- Cliente B2B/B2C opcional en proyectos
ALTER TABLE crm_projects
  ADD COLUMN IF NOT EXISTS customer_kind VARCHAR(32),
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_projects_contact_id ON crm_projects(contact_id)
  WHERE contact_id IS NOT NULL;
