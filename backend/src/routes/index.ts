import { Router } from 'express'

import { activitiesRouter } from './activities.routes.js'
import { accessProfilesRouter } from './access-profiles.routes.js'
import { authRouter } from './auth.routes.js'
import { companiesRouter } from './companies.routes.js'
import { contactsRouter } from './contacts.routes.js'
import { dashboardRouter } from './dashboard.routes.js'
import { inventoryRouter } from './inventory.routes.js'
import { boletasRouter } from './boletas.routes.js'
import { expensesRouter } from './expenses.routes.js'
import { invoicesRouter } from './invoices.routes.js'
import { siiRouter } from './sii.routes.js'
import { opportunitiesRouter } from './opportunities.routes.js'
import { purchasesRouter } from './purchases.routes.js'
import { reportsRouter } from './reports.routes.js'
import { searchRouter } from './search.routes.js'
import { stockReceiptsRouter } from './stock-receipts.routes.js'
import { geoRouter } from './geo.routes.js'
import { organizationSettingsRouter } from './organization-settings.routes.js'
import { productCategoriesRouter } from './product-categories.routes.js'
import { productsRouter } from './products.routes.js'
import { projectsRouter } from './projects.routes.js'
import { bitacoraRouter } from './bitacora.routes.js'
import { solicitudesRouter } from './solicitudes.routes.js'
import { solicitudPruebasRouter } from './solicitud-pruebas.routes.js'
import { quotesRouter } from './quotes.routes.js'
import { usersRouter } from './users.routes.js'
import { warehousesRouter } from './warehouses.routes.js'
import { bankAccountsRouter } from './bank-accounts.routes.js'
import { exchangeRatesRouter } from './exchange-rates.routes.js'
import { entityFilesRouter } from './entity-files.routes.js'
import { entityNotesRouter } from './entity-notes.routes.js'
import { mentionsRouter } from './mentions.routes.js'
import { notificationsRouter } from './notifications.routes.js'
import { marketingRouter } from './marketing.routes.js'
import { integrationsRouter } from './integrations.routes.js'
import { tenantQuotasRouter } from './tenant-quotas.routes.js'
import { privacyRouter } from './privacy.routes.js'

export const apiRouter = Router()

apiRouter.use('/integrations', integrationsRouter)
apiRouter.use('/tenant', tenantQuotasRouter)
apiRouter.use('/marketing', marketingRouter)
apiRouter.use('/privacy', privacyRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/dashboard', dashboardRouter)
apiRouter.use('/activities', activitiesRouter)
apiRouter.use('/access-profiles', accessProfilesRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/geo', geoRouter)
apiRouter.use('/organization-settings', organizationSettingsRouter)
apiRouter.use('/warehouses', warehousesRouter)
apiRouter.use('/bank-accounts', bankAccountsRouter)
apiRouter.use('/product-categories', productCategoriesRouter)
apiRouter.use('/products', productsRouter)
apiRouter.use('/contacts', contactsRouter)
apiRouter.use('/companies', companiesRouter)
apiRouter.use('/opportunities', opportunitiesRouter)
apiRouter.use('/purchases', purchasesRouter)
apiRouter.use('/stock-receipts', stockReceiptsRouter)
apiRouter.use('/inventory', inventoryRouter)
apiRouter.use('/quotes', quotesRouter)
apiRouter.use('/invoices', invoicesRouter)
apiRouter.use('/boletas', boletasRouter)
apiRouter.use('/expenses', expensesRouter)
apiRouter.use('/sii', siiRouter)
apiRouter.use('/projects', projectsRouter)
apiRouter.use('/solicitudes', solicitudesRouter)
apiRouter.use('/pruebas-solicitud', solicitudPruebasRouter)
apiRouter.use('/bitacora', bitacoraRouter)
apiRouter.use('/reports', reportsRouter)
apiRouter.use('/search', searchRouter)
apiRouter.use('/notifications', notificationsRouter)
apiRouter.use('/exchange-rates', exchangeRatesRouter)
apiRouter.use('/entity-files', entityFilesRouter)
apiRouter.use('/entity-notes', entityNotesRouter)
apiRouter.use('/mentions', mentionsRouter)
