import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PLATFORM_LEGAL } from '@/lib/platform-legal'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

const SUBPROCESSORS = [
  {
    name: 'DigitalOcean, LLC',
    purpose: 'Infraestructura cloud y alojamiento de servidores',
    location: 'Estados Unidos / región configurada',
    safeguards: 'Contrato de encargado, cifrado TLS, acceso restringido',
  },
  {
    name: 'Proveedor de correo transaccional',
    purpose: 'Envío de correos operativos, invitaciones y notificaciones',
    location: 'Unión Europea / Estados Unidos según proveedor activo',
    safeguards: 'Contrato DPA, minimización de datos en plantillas',
  },
] as const

export function LegalSubprocessorsPage() {
  useMarketingPageMeta(
    'Subprocesadores',
    'Listado de encargados del tratamiento que procesan datos por cuenta de Kora CRM.',
  )

  return (
    <LegalPageLayout
      title="Subprocesadores y Encargados del Tratamiento"
      version={PLATFORM_LEGAL.privacyVersion}
      effectiveDate={PLATFORM_LEGAL.privacyEffectiveDate}
    >
      <section>
        <h2>1. Objeto</h2>
        <p>
          En cumplimiento del Art. 15 bis de la Ley 21.719, publicamos el listado de terceros que
          procesan datos personales por cuenta de {PLATFORM_LEGAL.controllerLegalName} al prestar{' '}
          {PLATFORM_LEGAL.controllerTradeName}. Todos operan bajo instrucciones documentadas y
          cláusulas de confidencialidad y seguridad.
        </p>
      </section>

      <section>
        <h2>2. Listado vigente</h2>
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
          <table className="legal-document-table">
            <thead>
              <tr>
                <th>Encargado</th>
                <th>Finalidad</th>
                <th>Ubicación</th>
                <th>Garantías</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.purpose}</td>
                  <td>{row.location}</td>
                  <td>{row.safeguards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Este listado puede actualizarse cuando incorporemos o sustituyamos proveedores. Los
          clientes empresariales serán notificados con antelación razonable cuando el cambio sea
          sustancial conforme al contrato de servicios.
        </p>
      </section>

      <section>
        <h2>3. Transferencias internacionales</h2>
        <p>
          Cuando un subprocesador trata datos fuera de Chile, implementamos salvaguardas contractuales
          y medidas técnicas acordes a los arts. 27–29 de la Ley 21.719.
        </p>
      </section>

      <section>
        <h2>4. Consultas</h2>
        <p>
          Para solicitar copia del acuerdo de encargado (DPA) o información adicional:{' '}
          <a href={`mailto:${PLATFORM_LEGAL.controllerEmail}`}>{PLATFORM_LEGAL.controllerEmail}</a>
        </p>
      </section>
    </LegalPageLayout>
  )
}
