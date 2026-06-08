import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppDataProviders } from '@/components/layout/AppDataProviders'
import { AppShell } from '@/components/layout/AppShell'
import { RouteAccessGuard } from '@/components/layout/RouteAccessGuard'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/auth'
import { ShellLayoutProvider } from '@/contexts/shell-layout'
import { listModuleSlugs } from '@/config/list-modules'
import { sidebarRoutes } from '@/navigation'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { ActivityDetailPage } from '@/pages/ActivityDetailPage'
import { ContactDetailPage } from '@/pages/ContactDetailPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { CompanyDetailPage } from '@/pages/CompanyDetailPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ModuleListRoutePage } from '@/pages/ModuleListRoutePage'
import { OpportunitiesPage } from '@/pages/OpportunitiesPage'
import { OpportunityDetailPage } from '@/pages/OpportunityDetailPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SolicitudesPage } from '@/pages/SolicitudesPage'
import { SolicitudDetailPage } from '@/pages/SolicitudDetailPage'
import { InventoryDetailPage } from '@/pages/InventoryDetailPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { PurchaseDetailPage } from '@/pages/PurchaseDetailPage'
import { PurchasesPage } from '@/pages/PurchasesPage'
import { StockReceiptDetailPage } from '@/pages/StockReceiptDetailPage'
import { StockReceiptsPage } from '@/pages/StockReceiptsPage'
import { QuoteDetailPage } from '@/pages/QuoteDetailPage'
import { QuotesPage } from '@/pages/QuotesPage'
import { UserDetailPage } from '@/pages/UserDetailPage'
import { UsersPage } from '@/pages/UsersPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ProfileDetailPage } from '@/pages/ProfileDetailPage'
import { ProfilesPage } from '@/pages/ProfilesPage'
import { ActivateAccountPage } from '@/pages/ActivateAccountPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { CentralMarketingOnly } from '@/components/auth/CentralMarketingOnly'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { MarketingFeaturesPage } from '@/pages/marketing/MarketingFeaturesPage'
import { MarketingHomePage } from '@/pages/marketing/MarketingHomePage'
import { MarketingPricingPage } from '@/pages/marketing/MarketingPricingPage'
import { MarketingTrialPage } from '@/pages/marketing/MarketingTrialPage'
import { MarketingSupportPage } from '@/pages/marketing/MarketingSupportPage'

const listRoutePaths = new Set<string>(listModuleSlugs)

export default function App() {
  return (
    <AuthProvider>
      <ShellLayoutProvider>
        <Toaster />
        <Routes>
          <Route
            element={
              <CentralMarketingOnly>
                <MarketingLayout />
              </CentralMarketingOnly>
            }
          >
            <Route index element={<MarketingHomePage />} />
            <Route path="producto" element={<Navigate to="/" replace />} />
            <Route path="funcionalidades" element={<MarketingFeaturesPage />} />
            <Route path="planes" element={<MarketingPricingPage />} />
            <Route path="prueba-gratis" element={<MarketingTrialPage />} />
            <Route path="soporte" element={<MarketingSupportPage />} />
          </Route>
          <Route path="login" element={<LoginPage />} />
          <Route path="activar-cuenta" element={<ActivateAccountPage />} />
          <Route path="olvide-contraseña" element={<ForgotPasswordPage />} />
          <Route path="restablecer-contraseña" element={<ResetPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppDataProviders />}>
              <Route element={<AppShell />}>
                <Route element={<RouteAccessGuard />}>
                  <Route path="inicio" element={<WelcomePage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="contactos" element={<ContactsPage />} />
                  <Route path="contactos/:contactId" element={<ContactDetailPage />} />
                  <Route path="empresas" element={<CompaniesPage />} />
                  <Route path="empresas/:companyId" element={<CompanyDetailPage />} />
                  <Route path="oportunidades" element={<OpportunitiesPage />} />
                  <Route
                    path="oportunidades/:opportunityId"
                    element={<OpportunityDetailPage />}
                  />
                  <Route path="cotizaciones" element={<QuotesPage />} />
                  <Route path="cotizaciones/:quoteId" element={<QuoteDetailPage />} />
                  <Route path="actividades" element={<ActivitiesPage />} />
                  <Route path="actividades/:activityId" element={<ActivityDetailPage />} />
                  <Route path="proyectos" element={<ProjectsPage />} />
                  <Route path="proyectos/:projectId" element={<ProjectDetailPage />} />
                  <Route path="solicitudes" element={<SolicitudesPage />} />
                  <Route path="solicitudes/:solicitudId" element={<SolicitudDetailPage />} />
                  <Route path="compras" element={<PurchasesPage />} />
                  <Route path="compras/:purchaseId" element={<PurchaseDetailPage />} />
                  <Route path="ingresos" element={<StockReceiptsPage />} />
                  <Route path="ingresos/:receiptId" element={<StockReceiptDetailPage />} />
                  <Route path="inventario" element={<InventoryPage />} />
                  <Route path="inventario/:inventoryId" element={<InventoryDetailPage />} />
                  <Route path="productos" element={<ProductsPage />} />
                  <Route path="productos/:productId" element={<ProductDetailPage />} />
                  <Route path="facturacion" element={<InvoicesPage />} />
                  <Route path="facturacion/:invoiceId" element={<InvoiceDetailPage />} />
                  <Route path="usuarios" element={<UsersPage />} />
                  <Route path="usuarios/:userId" element={<UserDetailPage />} />
                  <Route path="perfiles" element={<ProfilesPage />} />
                  <Route path="perfiles/:profileId" element={<ProfileDetailPage />} />
                  <Route path="reportes" element={<ReportsPage />} />
                  <Route path="configuracion" element={<SettingsPage />} />
                  {listModuleSlugs
                    .filter(
                      (slug) =>
                        slug !== 'contactos' &&
                        slug !== 'empresas' &&
                        slug !== 'oportunidades' &&
                        slug !== 'cotizaciones' &&
                        slug !== 'actividades' &&
                        slug !== 'proyectos' &&
                        slug !== 'solicitudes' &&
                        slug !== 'productos' &&
                        slug !== 'facturacion' &&
                        slug !== 'usuarios' &&
                        slug !== 'reportes' &&
                        slug !== 'configuracion',
                    )
                    .map((slug) => (
                      <Route
                        key={slug}
                        path={slug}
                        element={<ModuleListRoutePage slug={slug} />}
                      />
                    ))}
                  {sidebarRoutes
                    .filter(
                      (route) =>
                        !listRoutePaths.has(route.path.replace(/^\//, '')) &&
                        route.path !== '/configuracion',
                    )
                    .map((route) => (
                      <Route
                        key={route.path}
                        path={route.path.replace(/^\//, '')}
                        element={<PlaceholderPage title={route.label} />}
                      />
                    ))}
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </ShellLayoutProvider>
    </AuthProvider>
  )
}
