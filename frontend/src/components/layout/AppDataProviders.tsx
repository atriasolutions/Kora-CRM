import { Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'

import { AccessControlProvider } from '@/contexts/access-control'
import { ActivitiesRegistryProvider } from '@/contexts/activities-registry'
import { CatalogSettingsProvider } from '@/contexts/catalog-settings'
import { CompaniesRegistryProvider } from '@/contexts/companies-registry'
import { ContactsRegistryProvider } from '@/contexts/contacts-registry'
import { InventoryRegistryProvider } from '@/contexts/inventory-registry'
import { InvoicesRegistryProvider } from '@/contexts/invoices-registry'
import { OpportunitiesRegistryProvider } from '@/contexts/opportunities-registry'
import { OrganizationSettingsProvider } from '@/contexts/organization-settings'
import { ProductsRegistryProvider } from '@/contexts/products-registry'
import { ProfilesRegistryProvider } from '@/contexts/profiles-registry'
import { ProjectsRegistryProvider } from '@/contexts/projects-registry'
import { BitacoraRegistryProvider } from '@/contexts/bitacora-registry'
import { SolicitudesRegistryProvider } from '@/contexts/solicitudes-registry'
import { PurchasesRegistryProvider } from '@/contexts/purchases-registry'
import { QuotesRegistryProvider } from '@/contexts/quotes-registry'
import { ReportsRegistryProvider } from '@/contexts/reports-registry'
import { StockReceiptsRegistryProvider } from '@/contexts/stock-receipts-registry'
import { UsersRegistryProvider } from '@/contexts/users-registry'
import { NotificationsProvider } from '@/contexts/notifications-context'
/**
 * Registries y settings solo tras autenticación — evita cargas API y memoria en /login.
 */
export function AppDataProviders({ children }: { children?: ReactNode }) {
  return (
    <OrganizationSettingsProvider>
      <ProfilesRegistryProvider>
        <AccessControlProvider>
          <NotificationsProvider>
            <UsersRegistryProvider>
            <CatalogSettingsProvider>
              <ContactsRegistryProvider>
                <CompaniesRegistryProvider>
                  <OpportunitiesRegistryProvider>
                    <ActivitiesRegistryProvider>
                      <ProjectsRegistryProvider>
                        <SolicitudesRegistryProvider>
                        <BitacoraRegistryProvider>
                        <ProductsRegistryProvider>
                          <InvoicesRegistryProvider>
                            <ReportsRegistryProvider>
                              <PurchasesRegistryProvider>
                                <StockReceiptsRegistryProvider>
                                  <QuotesRegistryProvider>
                                    <InventoryRegistryProvider>
                                      {children ?? <Outlet />}
                                    </InventoryRegistryProvider>
                                  </QuotesRegistryProvider>
                                </StockReceiptsRegistryProvider>
                              </PurchasesRegistryProvider>
                            </ReportsRegistryProvider>
                          </InvoicesRegistryProvider>
                        </ProductsRegistryProvider>
                        </BitacoraRegistryProvider>
                        </SolicitudesRegistryProvider>
                      </ProjectsRegistryProvider>
                    </ActivitiesRegistryProvider>
                  </OpportunitiesRegistryProvider>
                </CompaniesRegistryProvider>
              </ContactsRegistryProvider>
            </CatalogSettingsProvider>
            </UsersRegistryProvider>
          </NotificationsProvider>
        </AccessControlProvider>
      </ProfilesRegistryProvider>
    </OrganizationSettingsProvider>
  )
}
