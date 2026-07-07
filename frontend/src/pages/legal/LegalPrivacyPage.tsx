import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PLATFORM_LEGAL } from '@/lib/platform-legal'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

export function LegalPrivacyPage() {
  useMarketingPageMeta(
    'Política de privacidad',
    'Política de tratamiento de datos personales de Kora CRM conforme a la Ley 21.719 de Chile.',
  )

  return (
    <LegalPageLayout
      title="Política de Privacidad y Tratamiento de Datos Personales"
      version={PLATFORM_LEGAL.privacyVersion}
      effectiveDate={PLATFORM_LEGAL.privacyEffectiveDate}
    >
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de los datos personales recolectados a través del sitio
          web y formularios de <strong>{PLATFORM_LEGAL.controllerTradeName}</strong> es{' '}
          <strong>{PLATFORM_LEGAL.controllerLegalName}</strong> («nosotros», «el Responsable»),
          con domicilio en {PLATFORM_LEGAL.controllerAddress}.
        </p>
        <p>
          Canal de privacidad:{' '}
          <a href={`mailto:${PLATFORM_LEGAL.controllerEmail}`}>{PLATFORM_LEGAL.controllerEmail}</a>
        </p>
      </section>

      <section>
        <h2>2. Marco legal</h2>
        <p>
          Esta política se dicta en cumplimiento de la Ley N° 21.719 sobre Protección de Datos
          Personales de Chile, su normativa complementaria y, en lo pertinente, de la Ley N°
          19.628 mientras resulte aplicable en régimen transitorio. La vigencia plena de la Ley
          21.719 rige desde el 1 de diciembre de 2026.
        </p>
      </section>

      <section>
        <h2>3. Datos que tratamos</h2>
        <ul>
          <li>
            <strong>Identificación y contacto:</strong> nombre, correo electrónico, teléfono, RUT
            u otro identificador tributario, cargo y empresa.
          </li>
          <li>
            <strong>Datos comerciales:</strong> información de la organización, volumen de
            empleados, dirección, región y comuna.
          </li>
          <li>
            <strong>Datos de uso del servicio:</strong> credenciales de acceso (cifradas), registros
            de actividad, preferencias y configuración de la cuenta.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP, agente de usuario, cookies técnicas
            necesarias para seguridad y sesión.
          </li>
        </ul>
        <p>
          No solicitamos datos sensibles en formularios públicos. Los clientes que usan Kora CRM
          como plataforma pueden tratar categorías adicionales en nombre propio; en ese caso actúan
          como responsables independientes.
        </p>
      </section>

      <section>
        <h2>4. Finalidades del tratamiento</h2>
        <ul>
          <li>Gestionar solicitudes de demostración, soporte y contacto comercial.</li>
          <li>Proveer, mantener y mejorar el servicio SaaS Kora CRM.</li>
          <li>Autenticación, seguridad, prevención de fraude y auditoría.</li>
          <li>Cumplir obligaciones legales, tributarias y contractuales.</li>
          <li>Comunicaciones operativas del servicio y, con consentimiento, marketing.</li>
        </ul>
      </section>

      <section>
        <h2>5. Bases de licitud</h2>
        <p>Tratamos datos personales cuando existe una de las siguientes bases:</p>
        <ul>
          <li>Consentimiento libre, específico e informado (formularios y marketing).</li>
          <li>Ejecución de contrato o medidas precontractuales (cuenta y demo).</li>
          <li>Obligación legal (facturación, conservación de registros).</li>
          <li>Interés legítimo ponderado (seguridad, mejora del producto, soporte).</li>
          <li>Datos de obligaciones económicas, financieras, bancarias o comerciales.</li>
        </ul>
      </section>

      <section>
        <h2>6. Destinatarios y encargados</h2>
        <p>
          Podemos comunicar datos a proveedores que actúan como encargados del tratamiento
          (hosting, correo electrónico, infraestructura cloud, analítica técnica), bajo contrato
          que exige confidencialidad y medidas de seguridad. Consulta el listado actualizado en la
          página de <a href="/legal/subprocesadores">Subprocesadores</a>.
        </p>
        <p>
          También podremos comunicar datos cuando la ley lo exija o para la defensa de derechos
          ante autoridades competentes, incluida la Agencia de Protección de Datos Personales (APDP).
        </p>
      </section>

      <section>
        <h2>7. Transferencias internacionales</h2>
        <p>
          Si algún encargado procesa datos fuera de Chile, adoptamos garantías contractuales y
          técnicas conforme a los arts. 27 y siguientes de la Ley 21.719, informando al titular
          cuando corresponda.
        </p>
      </section>

      <section>
        <h2>8. Plazos de conservación</h2>
        <p>
          Conservamos los datos el tiempo necesario para las finalidades indicadas y los plazos
          legales aplicables. Los registros de consentimiento y solicitudes ARSOPB se mantienen
          como evidencia de cumplimiento (accountability). Los datos de cuentas inactivas se
          eliminan o anonimizan según política interna y contrato.
        </p>
      </section>

      <section>
        <h2>9. Derechos del titular (ARSOPB)</h2>
        <p>Tienes derecho a solicitar:</p>
        <ul>
          <li><strong>Acceso</strong> a tus datos personales.</li>
          <li><strong>Rectificación</strong> de datos inexactos o incompletos.</li>
          <li><strong>Supresión</strong> cuando proceda.</li>
          <li><strong>Oposición</strong> al tratamiento en los casos previstos por ley.</li>
          <li><strong>Portabilidad</strong> en formato estructurado y de uso común.</li>
          <li><strong>Bloqueo</strong> temporal del tratamiento cuando corresponda.</li>
        </ul>
        <p>
          Envía tu solicitud a{' '}
          <a href={`mailto:${PLATFORM_LEGAL.controllerEmail}`}>{PLATFORM_LEGAL.controllerEmail}</a>.
          Responderemos en un plazo máximo de <strong>30 días corridos</strong>, prorrogables una
          vez por 30 días adicionales cuando la complejidad lo justifique (Art. 11 Ley 21.719).
        </p>
      </section>

      <section>
        <h2>10. Medidas de seguridad</h2>
        <p>
          Implementamos medidas técnicas y organizativas acordes al riesgo: cifrado en tránsito
          (TLS), control de acceso por roles, aislamiento multi-tenant, respaldos, registro de
          auditoría y procedimiento de gestión de incidentes de seguridad conforme al Art. 14
          sexies.
        </p>
      </section>

      <section>
        <h2>11. Menores de edad</h2>
        <p>
          Kora CRM está dirigido a organizaciones y profesionales. No recopilamos
          intencionalmente datos de menores de 14 años sin el consentimiento del titular de las
          patria potestad o representación legal.
        </p>
      </section>

      <section>
        <h2>12. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios legales o del servicio. Publicaremos
          la versión vigente en esta página e indicaremos la fecha de entrada en vigor. Los cambios
          sustanciales serán comunicados con antelación razonable cuando afecten el tratamiento en
          curso.
        </p>
      </section>
    </LegalPageLayout>
  )
}
