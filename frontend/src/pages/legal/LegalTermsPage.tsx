import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PLATFORM_LEGAL } from '@/lib/platform-legal'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

export function LegalTermsPage() {
  useMarketingPageMeta(
    'Términos de uso',
    'Términos y condiciones de uso de la plataforma Kora CRM.',
  )

  return (
    <LegalPageLayout
      title="Términos y Condiciones de Uso"
      version={PLATFORM_LEGAL.termsVersion}
      effectiveDate={PLATFORM_LEGAL.termsEffectiveDate}
    >
      <section>
        <h2>1. Aceptación</h2>
        <p>
          Al acceder o utilizar {PLATFORM_LEGAL.controllerTradeName} («el Servicio»), operado por{' '}
          {PLATFORM_LEGAL.controllerLegalName}, aceptas estos Términos y la Política de Privacidad
          vigente. Si actúas en representación de una organización, declaras contar con facultades
          para obligarla.
        </p>
      </section>

      <section>
        <h2>2. Descripción del servicio</h2>
        <p>
          Kora CRM es una plataforma SaaS de gestión comercial y operativa (contactos, oportunidades,
          inventario, facturación y módulos asociados), provista en modalidad multi-tenant bajo
          suscripción o período de prueba.
        </p>
      </section>

      <section>
        <h2>3. Cuenta y acceso</h2>
        <ul>
          <li>Debes proporcionar información veraz y mantenerla actualizada.</li>
          <li>Eres responsable de la confidencialidad de tus credenciales.</li>
          <li>Debes notificar accesos no autorizados sin demora.</li>
          <li>Podemos suspender cuentas ante uso fraudulento o incumplimiento grave.</li>
        </ul>
      </section>

      <section>
        <h2>4. Uso permitido</h2>
        <p>Te comprometes a:</p>
        <ul>
          <li>Usar el Servicio conforme a la ley chilena y estos Términos.</li>
          <li>
            Tratar datos personales de terceros únicamente con base legal válida y, cuando
            corresponda, informar a los titulares y atender sus derechos ARSOPB.
          </li>
          <li>No intentar vulnerar la seguridad, realizar ingeniería inversa ni sobrecargar la
            infraestructura.</li>
          <li>No utilizar el Servicio para spam, contenido ilícito o actividades que vulneren
            derechos de terceros.</li>
        </ul>
      </section>

      <section>
        <h2>5. Rol en protección de datos</h2>
        <p>
          En los datos que tus usuarios cargan en su instancia (contactos, clientes, empleados),
          <strong> tu organización es responsable del tratamiento</strong> y {PLATFORM_LEGAL.controllerLegalName}{' '}
          actúa como <strong>encargado del tratamiento</strong>, procesando datos por tu cuenta según
          tus instrucciones y el contrato de servicios / DPA aplicable.
        </p>
        <p>
          En los datos recolectados directamente por nosotros (sitio web, demo, soporte), actuamos
          como responsables conforme a la Política de Privacidad.
        </p>
      </section>

      <section>
        <h2>6. Propiedad intelectual</h2>
        <p>
          El software, marca, documentación y diseño del Servicio son propiedad de{' '}
          {PLATFORM_LEGAL.controllerLegalName} o sus licenciantes. Se te concede una licencia
          limitada, no exclusiva e intransferible de uso durante la vigencia del contrato.
        </p>
        <p>
          Conservas la propiedad de los datos y contenidos que ingreses. Nos otorgas una licencia
          limitada para alojarlos, respaldarlos y procesarlos a fin de prestar el Servicio.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidad y soporte</h2>
        <p>
          Procuramos alta disponibilidad del Servicio, sin garantizar operación ininterrumpida.
          Mantenimientos programados serán comunicados cuando sea razonable. El soporte se presta
          según el plan contratado y canales publicados.
        </p>
      </section>

      <section>
        <h2>8. Tarifas y facturación</h2>
        <p>
          Los precios, ciclos de facturación y condiciones comerciales se informan en la contratación
          o cotización. El impago puede derivar en suspensión del acceso tras aviso previo.
        </p>
      </section>

      <section>
        <h2>9. Limitación de responsabilidad</h2>
        <p>
          En la medida permitida por la ley, no seremos responsables por daños indirectos, lucro
          cesante o pérdida de datos derivados de causas fuera de nuestro control razonable. Nuestra
          responsabilidad total se limita al monto pagado por el Servicio en los doce meses
          anteriores al hecho que la origine, salvo dolo o culpa grave.
        </p>
      </section>

      <section>
        <h2>10. Terminación</h2>
        <p>
          Puedes cancelar según las condiciones contractuales. Tras la terminación, pondremos a
          disposición mecanismos razonables de exportación de datos y procederemos a la eliminación
          conforme a plazos legales y contractuales.
        </p>
      </section>

      <section>
        <h2>11. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia
          será sometida a los tribunales ordinarios de justicia de Santiago, sin perjuicio de
          derechos irrenunciables del consumidor cuando corresponda.
        </p>
      </section>

      <section>
        <h2>12. Contacto</h2>
        <p>
          Consultas legales o contractuales:{' '}
          <a href={`mailto:${PLATFORM_LEGAL.controllerEmail}`}>{PLATFORM_LEGAL.controllerEmail}</a>
        </p>
      </section>
    </LegalPageLayout>
  )
}
