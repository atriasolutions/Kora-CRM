-- Índices para listados multi-tenant, FKs hijas y agregaciones del dashboard.
-- Seguros: IF NOT EXISTS, sin cambiar datos ni constraints.

BEGIN;

-- Listados CRM activos por tenant
CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant_active_name
  ON crm_companies (tenant_id, name)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant_lifecycle_active
  ON crm_companies (tenant_id, lifecycle)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_active_updated
  ON crm_contacts (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_company_active
  ON crm_contacts (tenant_id, company_id)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant_active_updated
  ON crm_opportunities (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant_stage_active
  ON crm_opportunities (tenant_id, stage)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_quotes_tenant_active_updated
  ON crm_quotes (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_invoices_tenant_active_updated
  ON crm_invoices (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_invoices_tenant_company_active
  ON crm_invoices (tenant_id, company_id)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_products_tenant_active_updated
  ON crm_products (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_products_tenant_category_active
  ON crm_products (tenant_id, category_id)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_purchases_tenant_active_updated
  ON crm_purchases (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_projects_tenant_active_updated
  ON crm_projects (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant_active_scheduled
  ON crm_activities (tenant_id, scheduled_at NULLS LAST, created_at)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_stock_receipts_tenant_active_updated
  ON crm_stock_receipts (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_product_categories_tenant_active
  ON crm_product_categories (tenant_id, name)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_report_folders_tenant_parent_sort
  ON crm_report_folders (tenant_id, parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_crm_reports_tenant_folder_name
  ON crm_reports (tenant_id, folder_id, name);

-- Inventario
CREATE INDEX IF NOT EXISTS idx_crm_inventory_tenant_warehouse
  ON crm_inventory_positions (tenant_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_crm_inventory_tenant_product
  ON crm_inventory_positions (tenant_id, product_id);

-- Dashboard / agregaciones por fecha
CREATE INDEX IF NOT EXISTS idx_crm_invoices_tenant_paid_issue_date
  ON crm_invoices (tenant_id, issue_date)
  WHERE deleted_at IS NULL
    AND archived_at IS NULL
    AND status = 'Pagada'
    AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_purchases_tenant_order_date
  ON crm_purchases (tenant_id, order_date)
  WHERE deleted_at IS NULL
    AND archived_at IS NULL
    AND tenant_id IS NOT NULL;

-- Tablas hijas / FKs frecuentes
CREATE INDEX IF NOT EXISTS idx_crm_invoice_line_items_invoice
  ON crm_invoice_line_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_crm_invoice_line_items_product
  ON crm_invoice_line_items (product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_quote_line_items_quote
  ON crm_quote_line_items (quote_id);

CREATE INDEX IF NOT EXISTS idx_crm_opportunity_line_items_opp
  ON crm_opportunity_line_items (opportunity_id);

CREATE INDEX IF NOT EXISTS idx_crm_purchase_line_items_purchase
  ON crm_purchase_line_items (purchase_id);

CREATE INDEX IF NOT EXISTS idx_crm_invoice_payments_invoice
  ON crm_invoice_payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_crm_stock_reservations_invoice
  ON crm_stock_reservations (invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_stock_reservations_quote
  ON crm_stock_reservations (quote_id)
  WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_stock_movements_position
  ON crm_stock_movements (inventory_position_id);

CREATE INDEX IF NOT EXISTS idx_crm_company_addresses_company
  ON crm_company_addresses (company_id);

CREATE INDEX IF NOT EXISTS idx_crm_company_branches_company
  ON crm_company_branches (company_id);

CREATE INDEX IF NOT EXISTS idx_crm_project_team_members_project
  ON crm_project_team_members (project_id);

CREATE INDEX IF NOT EXISTS idx_crm_report_runs_report
  ON crm_report_runs (report_id);

COMMIT;
