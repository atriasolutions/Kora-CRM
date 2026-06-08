/** Textos para la sección «Conceptos» en Ayuda (etapas / estados). */

export const HELP_CONTACT_STATUS_CONCEPTS = [
  'Estados del contacto (campo «Estado» en la ficha): clasificación comercial de la persona. Se cambia manualmente al editar; no hay un orden obligatorio impuesto por el sistema.',
  'Prospecto: interés activo en evaluar una compra o proyecto contigo.',
  'Cliente: relación comercial activa como comprador (persona decisora o usuario en una cuenta cliente).',
  'Proveedor: contacto asociado a un socio que te suministra. Para órdenes de compra el sistema filtra por la etapa Proveedor en la empresa vinculada, no por este estado del contacto.',
  'Acciones en el sistema: filtrar listado, kanban y segmentos por estado; vincular empresa, oportunidades y actividades. Ningún estado bloquea por sí solo otras pantallas.',
]

export const HELP_COMPANY_LIFECYCLE_CONCEPTS = [
  'Etapas de empresa (campo «Etapa» en la ficha): clasificación de la organización. Se cambia manualmente al editar; no hay un camino obligatorio automático.',
  'Prospecto: hay interés comercial en curso (evaluación, demo, cotización en preparación).',
  'Cliente: compra o contrato activo contigo; úsala en cuentas a las que vendes (cotizaciones, oportunidades, facturación).',
  'Proveedor: suministra bienes o servicios a tu empresa. Acción en el sistema: solo las empresas en etapa Proveedor aparecen al elegir proveedor en Compras (orden de compra).',
  'Estado de cuenta (Activa / Inactiva): indica si la ficha sigue vigente para operar. Complementa la etapa; ayuda a filtrar cuentas descontinuadas sin borrar historial.',
  'Acciones en el sistema: filtrar por etapa en listado y kanban; editar ubicación (región/comuna o internacional); ver contactos y documentos relacionados.',
]

export const HELP_OPPORTUNITY_STAGE_CONCEPTS = [
  'En la ficha, el «camino de éxito» muestra la etapa actual y las transiciones permitidas (con permiso de edición). El monto (con IVA) y las líneas se actualizan al sincronizar una cotización de referencia desde la pestaña Cotizaciones.',
  'Ruta principal del embudo:',
  '· Calificados: negocio identificado. Siguiente habitual: En diagnóstico. También puedes marcar No calificada (cierre perdido).',
  '· En diagnóstico: levantamiento de necesidades. Puedes avanzar a Propuesta, pausar (En espera cliente / Pausada internamente) o cerrar como No calificada.',
  '· Propuesta: oferta presentada. Puedes pasar a Negociación, pausar o marcar Perdida.',
  '· Negociación: ajuste de condiciones. Puedes cerrar como Cerrada (ganada), pausar o marcar Perdida.',
  '· Cerrada: cierre ganado. No admite más avances en el embudo.',
  'Etapas fuera de ruta:',
  '· En espera cliente / Pausada internamente: pausa el negocio. Al reanudar, vuelves a la etapa principal desde la que saliste.',
  '· Perdida / No calificada: cierre perdido; el embudo queda cerrado en ese sentido.',
  'Acciones en el sistema: mover etapa desde el camino de éxito o al editar; registrar actividades; vincular cotizaciones. Puedes retroceder una etapa en la ruta principal cuando el flujo lo permite.',
]

export const HELP_QUOTE_STAGE_CONCEPTS = [
  'El estado de la cotización es su etapa en el flujo comercial. En la ficha, el «camino de éxito» indica los pasos siguientes permitidos.',
  'Ruta principal:',
  '· Borrador: documento en preparación interna. Solo puedes pasar a En revisión interna.',
  '· En revisión interna: validación interna antes de enviar al cliente. Puedes enviar (Enviada), pausar, rechazar o cancelar.',
  '· Enviada: propuesta entregada al cliente. Puedes pasar a En negociación, pausar, rechazar, marcar vencida o cancelar.',
  '· En negociación: ajustes con el cliente. Puedes marcar Aceptada, pausar, rechazar, vencer o cancelar.',
  '· Aceptada: el cliente aceptó. Es la etapa final del flujo ganador.',
  'Fuera de ruta: En espera cliente (pausa; al reanudar vuelves a la etapa principal anterior), Rechazada, Vencida y Cancelada (cierres sin venta).',
  'Acciones según etapa:',
  '· Aceptada: reserva stock en Inventario (campo Reservado); las líneas de la cotización dejan de ser editables; puedes generar factura desde la ficha.',
  '· Si sales de Aceptada hacia Borrador, revisión, Enviada, negociación, espera, rechazada, vencida o cancelada: se libera la reserva de stock.',
  '· PDF y duplicar: según permisos en otras etapas. Facturación: requiere cotización Aceptada.',
]

export const HELP_PROJECT_JOURNEY_CONCEPTS = [
  'En la ficha, el «camino de éxito» muestra la etapa del proyecto y las transiciones permitidas (con permiso de edición). Al cambiar etapa se actualiza el estado del listado y queda registro en el historial.',
  'Ruta principal:',
  '· Nuevo → En Levantamiento → En Proceso → Entregado a Cliente → Cerrado.',
  '· Puedes retroceder un paso en la ruta principal cuando el flujo lo permite.',
  'Detenciones (desde En Levantamiento o En Proceso):',
  '· Detenido por Cliente, Detenido internamente o En Espera Cliente pausan el avance.',
  '· Al reanudar desde una detención, vuelves a la etapa principal desde la que saliste.',
  'Acciones en el sistema: mover etapa en el camino de éxito; el encabezado muestra salud, prioridad, presupuesto, fechas y avance del plan de trabajo.',
]

export const HELP_SOLICITUD_JOURNEY_CONCEPTS = [
  'En la ficha, la «ruta del éxito» muestra la etapa actual y las transiciones permitidas (con permiso de edición). Al cambiar etapa se guarda el estado y queda registro en el historial de la sesión.',
  'Ruta principal:',
  '· Nuevo → Planificación → En Proceso → Entregado a Cliente → Cerrado.',
  '· Puedes retroceder un paso en la ruta principal cuando el flujo lo permite.',
  'Fuera de ruta (desde Planificación o En Proceso):',
  '· Detenido por cliente, Detenido Internamente o En espera de Cliente pausan el avance.',
  '· Al reanudar, vuelves a la etapa principal desde la que saliste.',
  'Prioridad (Baja, Media, Alta, Urgente): clasifica urgencia operativa; no bloquea transiciones de etapa.',
  'Acciones en el sistema: mover etapa en la ruta del éxito; kanban y segmentos agrupan por Activos, Detenidos y Cierre.',
]
