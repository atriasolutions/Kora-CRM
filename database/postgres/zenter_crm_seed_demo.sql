-- =============================================================================
-- Kora CRM — Seed demo (UUIDs fijos + snapshots)
-- Ejecutar DESPUÉS de kora_crm_full_install.sql
--
-- Contraseña demo (app): kora123 — hash bcrypt abajo solo para referencia API futura
-- =============================================================================

BEGIN;

-- UUIDs fijos documentados en crm_legacy_id_map (ver INSERT al final)
-- Perfiles de acceso
-- ---------------------------------------------------------------------------
INSERT INTO crm_access_profiles (id, name, description, is_system, updated_at) VALUES
  ('a1000001-0001-4001-8001-000000000001', 'Administrador', 'Acceso total a todos los módulos y acciones.', true, now()),
  ('a1000001-0001-4001-8001-000000000002', 'Ventas', 'CRM comercial: contactos, empresas, oportunidades y cotizaciones.', false, now()),
  ('a1000001-0001-4001-8001-000000000003', 'Solo lectura', 'Puede ver módulos asignados sin crear ni modificar registros.', false, now())
ON CONFLICT (id) DO NOTHING;

-- Permisos administrador (16 módulos, acceso completo)
INSERT INTO crm_access_profile_permissions (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT 'a1000001-0001-4001-8001-000000000001', m, true, true, true, true, true
FROM unnest(ARRAY[
  'dashboard','contactos','empresas','oportunidades','cotizaciones','facturacion',
  'actividades','proyectos','compras','ingresos','inventario','productos',
  'reportes','usuarios','perfiles','configuracion'
]::varchar[]) AS m
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- Permisos ventas (subset con CRUD comercial)
INSERT INTO crm_access_profile_permissions (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
VALUES
  ('a1000001-0001-4001-8001-000000000002', 'dashboard', true, true, false, false, false),
  ('a1000001-0001-4001-8001-000000000002', 'contactos', true, true, true, true, true),
  ('a1000001-0001-4001-8001-000000000002', 'empresas', true, true, true, true, true),
  ('a1000001-0001-4001-8001-000000000002', 'oportunidades', true, true, true, true, true),
  ('a1000001-0001-4001-8001-000000000002', 'cotizaciones', true, true, true, true, true),
  ('a1000001-0001-4001-8001-000000000002', 'actividades', true, true, true, true, false),
  ('a1000001-0001-4001-8001-000000000002', 'reportes', true, true, false, false, false)
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- Permisos solo lectura
INSERT INTO crm_access_profile_permissions (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT 'a1000001-0001-4001-8001-000000000003', m, true, true, false, false, false
FROM unnest(ARRAY['dashboard','contactos','empresas','oportunidades','reportes']::varchar[]) AS m
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Usuarios (password_hash demo = kora123)
-- ---------------------------------------------------------------------------
INSERT INTO crm_users (
  id, email, name, password_hash, role, profile_id, status, avatar_url,
  created_by_name, updated_by_name
) VALUES
  (
    'b1000001-0001-4001-8001-000000000001',
    'maria.lopez@kora.io',
    'María López',
    crypt('kora123', gen_salt('bf')),
    'Admin',
    'a1000001-0001-4001-8001-000000000001',
    'Activo',
    NULL,
    'Sistema', 'Sistema'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Configuración — organización, bodegas, categorías
-- ---------------------------------------------------------------------------
INSERT INTO crm_organization_settings (
  legal_name, trade_name, tagline, rut, giro, address, city, phone, email, default_vat_percent
) VALUES (
  'Kora SpA',
  'Kora CRM',
  'CRM comercial integral',
  '76.999.888-7',
  'Servicios de software',
  'Av. Providencia 1200, Santiago',
  'Santiago',
  '+56 2 2345 6789',
  'hola@kora.io',
  19
);

INSERT INTO crm_warehouses (id, name, code, address, region, commune, is_default, active) VALUES
  (
    'e1000001-0001-4001-8001-000000000001',
    'Bodega central',
    'BCEN',
    'Av. Providencia 1200',
    'Región Metropolitana de Santiago',
    'Providencia',
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_product_categories (id, name, active) VALUES
  ('f1000001-0001-4001-8001-000000000001', 'Software', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_products (
  id, name, sku, category_id, product_type, unit_of_measure,
  price_cents, cost_price_cents, stock_qty, status, track_inventory,
  created_by_name, updated_by_name
) VALUES
  (
    'e2000001-0001-4001-8001-000000000001',
    'Plan Starter',
    'PLN-STR-01',
    'f1000001-0001-4001-8001-000000000001',
    'Suscripción',
    'mes',
    4900,
    1200,
    NULL,
    'Activo',
    false,
    'María López',
    'María López'
  ),
  (
    'e2000001-0001-4001-8001-000000000002',
    'Plan Business',
    'PLN-BUS-01',
    'f1000001-0001-4001-8001-000000000001',
    'Suscripción',
    'mes',
    14900,
    3500,
    NULL,
    'Activo',
    false,
    'María López',
    'María López'
  ),
  (
    'e2000001-0001-4001-8001-000000000003',
    'Implementación CRM',
    'SRV-IMP-01',
    'f1000001-0001-4001-8001-000000000001',
    'Servicio',
    'proyecto',
    890000,
    420000,
    NULL,
    'Activo',
    false,
    'Carlos Vega',
    'Carlos Vega'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Empresas (seed co1..co8)
-- ---------------------------------------------------------------------------
INSERT INTO crm_companies (
  id, name, rut, industry, city, employees, owner_name, lifecycle, operational_status,
  created_by_name, updated_by_name
) VALUES
  ('c1000001-0001-4001-8001-000000000001', 'Tech Solutions', '76.123.456-7', 'Software B2B', 'Buenos Aires', '120', 'María López', 'Cliente', 'Activa', 'María López', 'María López'),
  ('c1000001-0001-4001-8001-000000000002', 'Nova Retail', '900.456.789-1', 'Retail', 'Bogotá', '340', 'Carlos Vega', 'Prospecto', 'Activa', 'Carlos Vega', 'Carlos Vega'),
  ('c1000001-0001-4001-8001-000000000003', 'Industrial Plus', '84.555.222-3', 'Manufactura', 'Monterrey', '890', 'Ana Ruiz', 'Prospecto', 'Activa', 'Ana Ruiz', 'Ana Ruiz'),
  ('c1000001-0001-4001-8001-000000000004', 'BlueWave', '55.888.111-K', 'E-commerce', 'Ciudad de México', '45', 'María López', 'Proveedor', 'Activa', 'María López', 'María López'),
  ('c1000001-0001-4001-8001-000000000005', 'FinNova', 'B88234156', 'Fintech', 'Madrid', '210', 'Diego Méndez', 'Cliente', 'Inactiva', 'Diego Méndez', 'Diego Méndez'),
  ('c1000001-0001-4001-8001-000000000006', 'AgroSur', '30.712.890-4', 'Agroindustria', 'Rosario', '520', 'Laura Fernández', 'Cliente', 'Activa', 'Laura Fernández', 'Laura Fernández'),
  ('c1000001-0001-4001-8001-000000000007', 'Logistics Co', '96.789.100-2', 'Logística', 'Santiago', '1.200', 'Roberto Sánchez', 'Cliente', 'Activa', 'Roberto Sánchez', 'Roberto Sánchez'),
  ('c1000001-0001-4001-8001-000000000008', 'MedLab Digital', '77.654.321-0', 'Salud', 'Lima', '78', 'Valentina Torres', 'Prospecto', 'Activa', 'Valentina Torres', 'Valentina Torres')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Contactos (FK + snapshot company_name)
-- ---------------------------------------------------------------------------
INSERT INTO crm_contacts (
  id, name, subtitle, company_id, company_name, email, phone, job_title, status,
  owner_name, created_by_name, updated_by_name
) VALUES
  (
    'd1000001-0001-4001-8001-000000000001',
    'Juan Pérez',
    'CTO en Tech Solutions',
    'c1000001-0001-4001-8001-000000000001',
    'Tech Solutions',
    'juan.perez@techsolutions.com',
    '+54 11 5843-9210',
    'Chief Technology Officer',
    'Cliente',
    'María López',
    'María López', 'María López'
  ),
  (
    'd1000001-0001-4001-8001-000000000002',
    'María González',
    'Directora de Compras',
    'c1000001-0001-4001-8001-000000000003',
    'Industrial Plus',
    'maria.gonzalez@industrialplus.com',
    '+52 81 1234-5678',
    'Directora de Compras',
    'Prospecto',
    'Ana Ruiz',
    'Ana Ruiz', 'Ana Ruiz'
  ),
  (
    'd1000001-0001-4001-8001-000000000003',
    'Pedro Ramírez',
    'Gerente IT',
    'c1000001-0001-4001-8001-000000000002',
    'Nova Retail',
    'pedro.ramirez@novaretail.com',
    '+57 1 765 4321',
    'Gerente IT',
    'Lead',
    'Carlos Vega',
    'Carlos Vega', 'Carlos Vega'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Oportunidad demo (snapshots empresa + contacto)
-- ---------------------------------------------------------------------------
INSERT INTO crm_opportunities (
  id, name, customer_kind, company_id, company_name, contact_id, contact_name,
  amount_cents, weighted_amount_cents, stage, probability_pct, close_date,
  owner_name, opp_type, priority, outcome, source,
  created_by_name, updated_by_name
) VALUES (
  'f2000001-0001-4001-8001-000000000001',
  'Expansión cloud',
  'empresa',
  'c1000001-0001-4001-8001-000000000001',
  'Tech Solutions',
  'd1000001-0001-4001-8001-000000000001',
  'Juan Pérez',
  5540000,
  3324000,
  'Propuesta',
  60,
  '2024-08-30',
  'María López',
  'Nuevo negocio',
  'Alta',
  'Abierta',
  'Referido',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_opportunity_line_items (
  id, opportunity_id, product_name, quantity, unit_price_cents, discount_pct, total_cents, sort_order
) VALUES (
  'f2100001-0001-4001-8001-000000000001',
  'f2000001-0001-4001-8001-000000000001',
  'Licencias cloud — plan anual',
  1,
  5540000,
  0,
  5540000,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_quotes (
  id, code, title, opportunity_id, opportunity_name,
  company_id, company_name, contact_id, contact_name,
  amount_cents, status, valid_until, issue_date,
  owner_name, customer_kind, created_by_name, updated_by_name
) VALUES (
  'f3000001-0001-4001-8001-000000000001',
  'COT-2024-0142',
  'Licencias cloud — plan anual',
  'f2000001-0001-4001-8001-000000000001',
  'Expansión cloud',
  'c1000001-0001-4001-8001-000000000001',
  'Tech Solutions',
  'd1000001-0001-4001-8001-000000000001',
  'Juan Pérez',
  5540000,
  'Aceptada',
  '2024-06-30',
  '2024-05-12',
  'María López',
  'empresa',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_quote_line_items (
  id, quote_id, product_name, sku, quantity, unit_price_cents, discount_pct, total_cents, sort_order
) VALUES (
  'f3100001-0001-4001-8001-000000000001',
  'f3000001-0001-4001-8001-000000000001',
  'Licencias cloud — plan anual',
  'CLOUD-ANUAL',
  1,
  5540000,
  0,
  5540000,
  0
) ON CONFLICT (id) DO NOTHING;

-- Facturas demo (ligadas a cotización aceptada COT-2024-0142)
INSERT INTO crm_invoices (
  id, number, client_name, customer_kind, contact_id, contact_name,
  company_id, company_name, quote_id, quote_code, amount_cents,
  issue_date, due_date, status, owner_name, payment_method, sii_number,
  created_by_name, updated_by_name
) VALUES (
  'h1000001-0001-4001-8001-000000000001',
  'FAC-2024-0842',
  'Tech Solutions',
  'empresa',
  'd1000001-0001-4001-8001-000000000001',
  'Juan Pérez',
  'c1000001-0001-4001-8001-000000000001',
  'Tech Solutions',
  'f3000001-0001-4001-8001-000000000001',
  'COT-2024-0142',
  5540000,
  '2024-05-01',
  '2024-05-15',
  'Pagada',
  'María López',
  'Transferencia',
  '842156',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_invoice_line_items (
  id, invoice_id, product_name, sku, quantity, unit_price_cents, discount_pct, total_cents, sort_order
) VALUES (
  'h1100001-0001-4001-8001-000000000001',
  'h1000001-0001-4001-8001-000000000001',
  'Licencias cloud — plan anual',
  'CLOUD-ANUAL',
  1,
  5540000,
  0,
  5540000,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_invoice_payments (
  id, invoice_id, amount_cents, paid_at, method, status, reference
) VALUES (
  'h1200001-0001-4001-8001-000000000001',
  'h1000001-0001-4001-8001-000000000001',
  5540000,
  '2024-05-15 12:00:00+00',
  'Transferencia',
  'Confirmado',
  'PAG-FAC-2024-0842'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_invoices (
  id, number, client_name, customer_kind,
  company_id, company_name, amount_cents,
  issue_date, due_date, status, owner_name, payment_method,
  created_by_name, updated_by_name
) VALUES (
  'h1000001-0001-4001-8001-000000000002',
  'FAC-2024-0901',
  'Nova Retail',
  'empresa',
  'c1000001-0001-4001-8001-000000000002',
  'Nova Retail',
  3200000,
  '2024-05-10',
  '2024-06-10',
  'Pendiente',
  'María López',
  'Transferencia',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_invoice_line_items (
  id, invoice_id, product_name, sku, quantity, unit_price_cents, discount_pct, total_cents, sort_order
) VALUES (
  'h1100001-0001-4001-8001-000000000002',
  'h1000001-0001-4001-8001-000000000002',
  'Implementación CRM',
  'SRV-CRM-IMP',
  1,
  3200000,
  0,
  3200000,
  0
) ON CONFLICT (id) DO NOTHING;

-- Proyectos demo
INSERT INTO crm_projects (
  id, name, client_name, company_id, opportunity_id, opportunity_name,
  accepted_quote_id, quote_code, progress_pct, deadline, manager_name,
  journey_stage, status, priority, health, budget_cents, start_date,
  created_by_name, updated_by_name
) VALUES (
  'i1000001-0001-4001-8001-000000000001',
  'Implementación SaaS Core',
  'Tech Solutions',
  'c1000001-0001-4001-8001-000000000001',
  'f2000001-0001-4001-8001-000000000001',
  'Expansión cloud',
  'f3000001-0001-4001-8001-000000000001',
  'COT-2024-0142',
  75,
  '2024-06-30',
  'María López',
  'En Proceso',
  'En curso',
  'Alta',
  'En plazo',
  12000000,
  '2024-03-15',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_project_team_members (id, project_id, user_name, role_label) VALUES
  ('i1100001-0001-4001-8001-000000000001', 'i1000001-0001-4001-8001-000000000001', 'María López', 'Gerente de proyecto'),
  ('i1100001-0001-4001-8001-000000000002', 'i1000001-0001-4001-8001-000000000001', 'Equipo implementación', 'Consultor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_projects (
  id, name, client_name, company_id, progress_pct, deadline, manager_name,
  journey_stage, status, priority, health, budget_cents, start_date,
  created_by_name, updated_by_name
) VALUES (
  'i1000001-0001-4001-8001-000000000002',
  'Capacitación ventas LATAM',
  'Nova Retail',
  'c1000001-0001-4001-8001-000000000002',
  30,
  '2024-09-01',
  'Ana Ruiz',
  'En Levantamiento',
  'En curso',
  'Media',
  'En plazo',
  3200000,
  '2024-04-20',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_project_team_members (id, project_id, user_name, role_label) VALUES
  ('i1100001-0001-4001-8001-000000000003', 'i1000001-0001-4001-8001-000000000002', 'Ana Ruiz', 'Gerente de proyecto')
ON CONFLICT (id) DO NOTHING;

-- Actividades demo
INSERT INTO crm_activities (
  id, title, activity_type, type_label, related_type, related_id, related_name,
  company_name, due_at, assignee_name, status, priority, scheduled_at,
  created_by_name, updated_by_name
) VALUES (
  'j1000001-0001-4001-8001-000000000001',
  'Llamar a Juan Pérez',
  'llamada',
  'Llamada',
  'contacto',
  'd1000001-0001-4001-8001-000000000001',
  'Juan Pérez',
  'Tech Solutions',
  '2024-05-16 14:30:00+00',
  'María López',
  'Pendiente',
  'Alta',
  '2024-05-16 14:30:00+00',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_activities (
  id, title, activity_type, type_label, related_type, related_id, related_name,
  company_name, due_at, assignee_name, status, priority, scheduled_at,
  created_by_name, updated_by_name
) VALUES (
  'j1000001-0001-4001-8001-000000000002',
  'Seguimiento cotización cloud',
  'email',
  'Email',
  'oportunidad',
  'f2000001-0001-4001-8001-000000000001',
  'Expansión cloud',
  'Tech Solutions',
  '2024-05-17 17:00:00+00',
  'María López',
  'Pendiente',
  'Alta',
  '2024-05-17 17:00:00+00',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_activities (
  id, title, activity_type, type_label, related_type, related_id, related_name,
  company_name, due_at, assignee_name, status, priority, scheduled_at,
  created_by_name, updated_by_name
) VALUES (
  'j1000001-0001-4001-8001-000000000003',
  'Kick-off proyecto SaaS',
  'reunion',
  'Reunión',
  'proyecto',
  'i1000001-0001-4001-8001-000000000001',
  'Implementación SaaS Core',
  'Tech Solutions',
  '2024-05-20 10:00:00+00',
  'María López',
  'En curso',
  'Media',
  '2024-05-20 10:00:00+00',
  'María López', 'María López'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Reportes (árbol demo — espejo de reports-tree.mock.ts)
-- ---------------------------------------------------------------------------
INSERT INTO crm_report_folders (id, name, parent_id, sort_order) VALUES
  ('k1000001-0001-4001-8001-000000000001', 'Ventas', NULL, 0),
  ('k1000001-0001-4001-8001-000000000002', 'Finanzas', NULL, 1),
  ('k1000001-0001-4001-8001-000000000003', 'Operaciones', NULL, 2),
  ('k1000001-0001-4001-8001-000000000004', 'Marketing', NULL, 3),
  ('k1000001-0001-4001-8001-000000000005', 'Proyectos', NULL, 4),
  ('k1000001-0001-4001-8001-000000000006', 'Experiencia cliente', NULL, 5),
  ('k1000001-0001-4001-8001-000000000007', 'Producto', NULL, 6),
  ('k1000001-0001-4001-8001-000000000008', 'Favoritos', NULL, 7),
  ('k1000001-0001-4001-8001-000000000009', 'Pipeline', 'k1000001-0001-4001-8001-000000000001', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_reports (
  id, folder_id, name, report_type, author_name, schedule, description,
  template_id, table_config, last_run_at, updated_at
) VALUES
  (
    'k2000001-0001-4001-8001-000000000001',
    'k1000001-0001-4001-8001-000000000009',
    'Pipeline por etapa',
    'table',
    'María López',
    'Diario',
    'Oportunidades filtradas por etapa y responsable.',
    'tabla-dinamica',
    '{"dataSource":"oportunidades","columnIds":[],"conditions":[],"combineMode":"all-and","customExpression":"","reportTypeLabel":"Tabla dinámica"}'::jsonb,
    '2024-05-18 08:00:00+00',
    '2024-05-18 12:00:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000002',
    'k1000001-0001-4001-8001-000000000004',
    'Conversión leads',
    'dashboard',
    'Laura Fernández',
    'Mensual',
    'Tasa de conversión por canal y campaña activa.',
    NULL,
    '{"reportTypeLabel":"Marketing"}'::jsonb,
    '2024-05-12 11:00:00+00',
    '2024-05-12 11:00:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000003',
    'k1000001-0001-4001-8001-000000000002',
    'Ingresos vs. meta',
    'dashboard',
    'Carlos Vega',
    'Semanal',
    'Comparativo de ingresos facturados contra meta del trimestre.',
    NULL,
    '{"reportTypeLabel":"Finanzas"}'::jsonb,
    '2024-05-17 18:30:00+00',
    '2024-05-17 18:30:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000004',
    'k1000001-0001-4001-8001-000000000002',
    'Facturas pendientes',
    'dashboard',
    'Roberto Sánchez',
    'Diario',
    'Listado de facturas por cobrar con aging y responsable.',
    NULL,
    '{"reportTypeLabel":"Finanzas"}'::jsonb,
    '2024-05-16 07:45:00+00',
    '2024-05-16 07:45:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000005',
    'k1000001-0001-4001-8001-000000000003',
    'Actividades del equipo',
    'dashboard',
    'Ana Ruiz',
    'Diario',
    'Actividades completadas y vencidas por usuario.',
    NULL,
    '{"reportTypeLabel":"Operaciones"}'::jsonb,
    '2024-05-14 09:15:00+00',
    '2024-05-14 09:15:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000006',
    'k1000001-0001-4001-8001-000000000005',
    'Proyectos en riesgo',
    'dashboard',
    'Diego Méndez',
    'Semanal',
    'Proyectos con salud en riesgo o retraso en entrega.',
    NULL,
    '{"reportTypeLabel":"Proyectos"}'::jsonb,
    '2024-05-10 16:20:00+00',
    '2024-05-10 16:20:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000007',
    'k1000001-0001-4001-8001-000000000006',
    'NPS clientes',
    'dashboard',
    'Valentina Torres',
    'Trimestral',
    'Net Promoter Score por segmento y evolución trimestral.',
    'nps-clientes',
    '{"reportTypeLabel":"CX"}'::jsonb,
    '2024-05-01 12:00:00+00',
    '2024-05-01 12:00:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000008',
    'k1000001-0001-4001-8001-000000000007',
    'Uso por módulo',
    'dashboard',
    'María López',
    'Semanal',
    'Adopción de módulos del CRM por equipo y licencia.',
    NULL,
    '{"reportTypeLabel":"Producto"}'::jsonb,
    '2024-05-15 10:30:00+00',
    '2024-05-15 10:30:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000009',
    'k1000001-0001-4001-8001-000000000001',
    'Oportunidades ganadas',
    'table',
    'María López',
    'Semanal',
    'Oportunidades en etapa ganada con filtros combinables.',
    'tabla-dinamica',
    '{"dataSource":"oportunidades","columnIds":[],"conditions":[{"id":"c1","fieldId":"stage","operator":"contains","value":"Ganad"},{"id":"c2","fieldId":"probability","operator":"equals","value":"100%"}],"combineMode":"custom","customExpression":"1 O 2","reportTypeLabel":"Tabla dinámica"}'::jsonb,
    '2024-05-17 14:00:00+00',
    '2024-05-17 14:00:00+00'
  ),
  (
    'k2000001-0001-4001-8001-000000000010',
    'k1000001-0001-4001-8001-000000000008',
    'Resumen ejecutivo',
    'dashboard',
    'Carlos Vega',
    'Diario',
    'Vista consolidada KPIs para dirección.',
    NULL,
    '{"reportTypeLabel":"Ejecutivo"}'::jsonb,
    '2024-05-18 07:30:00+00',
    '2024-05-18 07:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mapeo legacy id → UUID (migración desde mocks)
-- ---------------------------------------------------------------------------
INSERT INTO crm_legacy_id_map (legacy_id, entity_type, uuid) VALUES
  ('p-admin', 'access_profile', 'a1000001-0001-4001-8001-000000000001'),
  ('p-ventas', 'access_profile', 'a1000001-0001-4001-8001-000000000002'),
  ('p-lectura', 'access_profile', 'a1000001-0001-4001-8001-000000000003'),
  ('u1', 'user', 'b1000001-0001-4001-8001-000000000001'),
  ('u2', 'user', 'b1000001-0001-4001-8001-000000000002'),
  ('u3', 'user', 'b1000001-0001-4001-8001-000000000003'),
  ('co1', 'company', 'c1000001-0001-4001-8001-000000000001'),
  ('co2', 'company', 'c1000001-0001-4001-8001-000000000002'),
  ('co3', 'company', 'c1000001-0001-4001-8001-000000000003'),
  ('co4', 'company', 'c1000001-0001-4001-8001-000000000004'),
  ('co5', 'company', 'c1000001-0001-4001-8001-000000000005'),
  ('co6', 'company', 'c1000001-0001-4001-8001-000000000006'),
  ('co7', 'company', 'c1000001-0001-4001-8001-000000000007'),
  ('co8', 'company', 'c1000001-0001-4001-8001-000000000008'),
  ('c1', 'contact', 'd1000001-0001-4001-8001-000000000001'),
  ('c2', 'contact', 'd1000001-0001-4001-8001-000000000002'),
  ('c3', 'contact', 'd1000001-0001-4001-8001-000000000003'),
  ('op1', 'opportunity', 'f2000001-0001-4001-8001-000000000001'),
  ('qt1', 'quote', 'f3000001-0001-4001-8001-000000000001'),
  ('prod1', 'product', 'e2000001-0001-4001-8001-000000000001'),
  ('prod2', 'product', 'e2000001-0001-4001-8001-000000000002'),
  ('prod3', 'product', 'e2000001-0001-4001-8001-000000000003'),
  ('pur1', 'purchase', 'g1000001-0001-4001-8001-000000000001'),
  ('sr1', 'stock_receipt', 'g2000001-0001-4001-8001-000000000001'),
  ('inv1', 'inventory', 'g3000001-0001-4001-8001-000000000001'),
  ('inv2', 'inventory', 'g3000001-0001-4001-8001-000000000002'),
  ('pr1', 'project', 'i1000001-0001-4001-8001-000000000001'),
  ('pr3', 'project', 'i1000001-0001-4001-8001-000000000002'),
  ('a1', 'activity', 'j1000001-0001-4001-8001-000000000001'),
  ('a2', 'activity', 'j1000001-0001-4001-8001-000000000002'),
  ('fld-ventas', 'report_folder', 'k1000001-0001-4001-8001-000000000001'),
  ('fld-finanzas', 'report_folder', 'k1000001-0001-4001-8001-000000000002'),
  ('fld-operaciones', 'report_folder', 'k1000001-0001-4001-8001-000000000003'),
  ('fld-marketing', 'report_folder', 'k1000001-0001-4001-8001-000000000004'),
  ('fld-proyectos', 'report_folder', 'k1000001-0001-4001-8001-000000000005'),
  ('fld-cx', 'report_folder', 'k1000001-0001-4001-8001-000000000006'),
  ('fld-producto', 'report_folder', 'k1000001-0001-4001-8001-000000000007'),
  ('fld-favoritos', 'report_folder', 'k1000001-0001-4001-8001-000000000008'),
  ('fld-ventas-pipeline', 'report_folder', 'k1000001-0001-4001-8001-000000000009'),
  ('rpt-1', 'report', 'k2000001-0001-4001-8001-000000000001'),
  ('rpt-2', 'report', 'k2000001-0001-4001-8001-000000000002'),
  ('rpt-3', 'report', 'k2000001-0001-4001-8001-000000000003'),
  ('rpt-4', 'report', 'k2000001-0001-4001-8001-000000000004'),
  ('rpt-5', 'report', 'k2000001-0001-4001-8001-000000000005'),
  ('rpt-6', 'report', 'k2000001-0001-4001-8001-000000000006'),
  ('rpt-7', 'report', 'k2000001-0001-4001-8001-000000000007'),
  ('rpt-8', 'report', 'k2000001-0001-4001-8001-000000000008'),
  ('rpt-9', 'report', 'k2000001-0001-4001-8001-000000000009'),
  ('rpt-10', 'report', 'k2000001-0001-4001-8001-000000000010')
ON CONFLICT (legacy_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Compras, ingresos e inventario (demo)
-- ---------------------------------------------------------------------------
INSERT INTO crm_purchases (
  id, reference, supplier_id, supplier_name, product_summary,
  order_date, amount_cents, status, owner_name,
  created_by_name, updated_by_name
) VALUES (
  'g1000001-0001-4001-8001-000000000001',
  'OC-2026-0001',
  'c1000001-0001-4001-8001-000000000004',
  'BlueWave',
  'PLN-BUS-01 · SRV-IMP-01',
  CURRENT_DATE,
  238000,
  'Pendiente',
  'María López',
  'María López',
  'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_purchase_line_items (
  id, purchase_id, product_id, product_name, sku, quantity, unit_price_cents, total_cents, sort_order
) VALUES
  (
    'g1100001-0001-4001-8001-000000000001',
    'g1000001-0001-4001-8001-000000000001',
    'e2000001-0001-4001-8001-000000000002',
    'Plan Business',
    'PLN-BUS-01',
    10,
    14900,
    149000,
    0
  ),
  (
    'g1100001-0001-4001-8001-000000000002',
    'g1000001-0001-4001-8001-000000000001',
    'e2000001-0001-4001-8001-000000000003',
    'Implementación CRM',
    'SRV-IMP-01',
    1,
    890000,
    890000,
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_stock_receipts (
  id, number, status, external_reference, purchase_id, purchase_reference,
  supplier_name, warehouse_id, warehouse_name, product_summary, line_count,
  owner_name, created_by_name, updated_by_name
) VALUES (
  'g2000001-0001-4001-8001-000000000001',
  'ING-2026-0001',
  'Borrador',
  'Recepción pendiente OC-2026-0001',
  'g1000001-0001-4001-8001-000000000001',
  'OC-2026-0001',
  'BlueWave',
  'e1000001-0001-4001-8001-000000000001',
  'Bodega central',
  'PLN-BUS-01',
  1,
  'María López',
  'María López',
  'María López'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_stock_receipt_lines (
  id, receipt_id, product_id, product_name, sku, quantity, sort_order
) VALUES (
  'g2100001-0001-4001-8001-000000000001',
  'g2000001-0001-4001-8001-000000000001',
  'e2000001-0001-4001-8001-000000000002',
  'Plan Business',
  'PLN-BUS-01',
  10,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_inventory_positions (
  id, product_id, product_name, sku, warehouse_id, warehouse_name,
  quantity_on_hand, quantity_reserved, quantity_available, min_stock, status,
  last_movement_at
) VALUES
  (
    'g3000001-0001-4001-8001-000000000001',
    'e2000001-0001-4001-8001-000000000002',
    'Plan Business',
    'PLN-BUS-01',
    'e1000001-0001-4001-8001-000000000001',
    'Bodega central',
    50,
    0,
    50,
    20,
    'En stock',
    now()
  ),
  (
    'g3000001-0001-4001-8001-000000000002',
    'e2000001-0001-4001-8001-000000000003',
    'Implementación CRM',
    'SRV-IMP-01',
    'e1000001-0001-4001-8001-000000000001',
    'Bodega central',
    2,
    0,
    2,
    0,
    'En stock',
    now()
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Fin seed demo
