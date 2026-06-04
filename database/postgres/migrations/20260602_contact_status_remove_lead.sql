-- Elimina el estado Lead de contactos (unifica en Prospecto).

UPDATE crm_contacts SET status = 'Prospecto' WHERE status = 'Lead';

ALTER TYPE crm_contact_status RENAME TO crm_contact_status_old;

CREATE TYPE crm_contact_status AS ENUM ('Prospecto', 'Cliente', 'Proveedor');

ALTER TABLE crm_contacts
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE crm_contacts
  ALTER COLUMN status TYPE crm_contact_status
  USING status::text::crm_contact_status;

ALTER TABLE crm_contacts
  ALTER COLUMN status SET DEFAULT 'Prospecto';

DROP TYPE crm_contact_status_old;
