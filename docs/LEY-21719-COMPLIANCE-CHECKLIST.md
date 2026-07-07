# Ley 21.719 — Checklist de cumplimiento para Kora CRM

> **Fecha del documento:** junio 2026  
> **Vigencia plena de la ley:** 1 de diciembre de 2026  
> **Alcance:** producto Kora CRM (SaaS multi-tenant) + operación de la plataforma (`koracrm.cl`)  
> **Estado:** análisis interno — **no constituye asesoría legal**

---

## 1. Resumen ejecutivo

La **Ley N° 21.719** (publicada el 13-dic-2024 en el Diario Oficial) **no es una reforma que entra en diciembre de 2026**: es la **ley nueva de protección de datos personales en Chile**, que **reemplaza en la práctica** el marco de la Ley 19.628 y entra en **vigencia plena el 1-dic-2026** (Art. primero transitorio). Desde esa fecha la **Agencia de Protección de Datos Personales (APDP)** podrá fiscalizar y sancionar.

**Kora CRM administra datos personales de terceros** (contactos, usuarios, leads, datos tributarios/comerciales). Por tanto, el ecosistema debe cumplir en **dos niveles**:

| Rol | Quién | Ejemplo |
|-----|--------|---------|
| **Responsable** | Cada cliente que usa Kora para gestionar *sus* contactos/empleados | Atria Solutions, un tenant `empresa.koracrm.cl` |
| **Encargado** | Quien trata datos **por cuenta** del responsable (infraestructura, hosting, correo) | Operador de Kora / proveedor SaaS |
| **Responsable directo** | Quien recolecta datos en formularios propios de la plataforma | Formulario «Prueba gratis» en `koracrm.cl` |

**Conclusión preliminar:** Kora tiene **bases técnicas sólidas** (multi-tenant, RLS, permisos, cifrado selectivo, borrado), pero **no cumple aún** varias obligaciones **organizacionales y de transparencia** exigidas por la ley (política Art. 14 ter, canal ARSOPB, RAT, contratos con encargados, procedimiento de brechas, etc.). El producto tampoco ofrece hoy un **módulo de derechos del titular** listo para que cada tenant atienda solicitudes en 30 días.

**Horizonte:** quedan ~6 meses hasta la vigencia plena. Existe además el **Boletín N° 18.060-07** (moción senatorial, ene-2026) que propone modificar aspectos de la 21.719; **no está aprobado** — el checklist se basa en el **texto vigente publicado**.

---

## 2. En qué consiste la Ley 21.719 (síntesis)

### 2.1 Hitos relevantes

| Hito | Fecha |
|------|--------|
| Publicación DO | 13-dic-2024 |
| Modificación institucional (Ley 21.806) | 5-feb-2026 — **no posterga** la vigencia |
| Instalación APDP (plazo legal / recomendado) | oct-2026 / jun-2026 |
| **Vigencia plena + sanciones** | **1-dic-2026** |
| Régimen transitorio PYME (amonestación vs multa, 1er año) | 1-dic-2026 → 1-dic-2027 (Art. sexto transitorio, empresas Ley 20.416) |

### 2.2 Principios (Art. 3°)

Licitud, lealtad, finalidad, proporcionalidad, calidad, responsabilidad (accountability), seguridad, transparencia, confidencialidad.

### 2.3 Derechos del titular — ARSOPB

La doctrina y la práctica comparada agrupan:

- **A**cceso  
- **R**ectificación  
- **S**upresión (eliminar cuando corresponda)  
- **O**posición  
- **P**ortabilidad (formato estructurado, uso común)  
- **B**loqueo temporal (Art. 8° ter — **objeto de debate** en Boletín 18.060-07)

**Plazo de respuesta ante el responsable:** 30 días corridos, prorrogables una vez por 30 días (Art. 11).

### 2.4 Bases de licitud (Arts. 12 y 13)

Tratamiento lícito con, entre otras:

- Consentimiento (libre, informado, específico, inequívoco)  
- Ejecución de contrato  
- Obligación legal  
- Interés legítimo (con ponderación)  
- Datos de obligaciones **económicas, financieras, bancarias o comerciales** (relevante para CRM/facturación)  
- Interés vital, defensa de derechos, funciones públicas  

### 2.5 Obligaciones clave del responsable (Título IV)

| Artículo | Obligación |
|----------|------------|
| 14 bis | Secreto / confidencialidad |
| **14 ter** | **Política pública de tratamiento** (12 elementos mínimos) |
| 14 quáter | Privacidad desde el diseño y por defecto |
| **14 quinquies** | **Medidas de seguridad** acordes al riesgo |
| **14 sexies** | **Notificación de brechas** a APDP y, si aplica, a titulares |
| 14 septies | Estándares diferenciados (tamaño empresa, tipo de dato) |
| 15 bis | Contrato con encargados del tratamiento |
| 16 y ss. | Datos sensibles, menores, biométricos, geolocalización |
| 27–29 | Transferencias internacionales |
| 49 (voluntario) | Modelo de prevención de infracciones + delegado de protección |

### 2.6 Sanciones (referencia — texto actual)

Multas hasta **5.000 / 10.000 / 20.000 UTM** (leves / graves / gravísimas); reincidencia puede llegar hasta **4% ingresos** en gravísimas. El Boletín 18.060-07 propone **reducir** estos montos.

### 2.7 Fuentes consultadas

- [Ley 21.719 — Biblioteca del Congreso (texto oficial)](https://www.bcn.cl/leychile/navegar?idNorma=1209272)  
- [Confidata — vigencia y transición](https://confidata.cl/blog/ley-21719-vigencia-transicion-plazo-adecuacion)  
- [PrivacidadWeb — obligaciones y régimen PYME](https://www.privacidadweb.cl/aprende/ley-21719)  
- [Kulvio — resumen ARSOPB y calendario](https://kulvio.cl/legal/ley-21719)  
- [Garrigues / DOE / Fischer — Boletín 18.060-07](https://www.garrigues.com/es_ES/noticia/chile-proyecto-ley-propone-modificar-ley-proteccion-datos-personales-equilibrar-proteccion)  
- Análisis del código y esquema de Kora CRM (jun-2026)

---

## 3. Datos personales que Kora administra hoy

Inventario derivado del esquema PostgreSQL (`crm_*`) y módulos del producto:

### 3.1 Por categoría

| Categoría | Datos | Módulos / tablas | Notas legales |
|-----------|-------|------------------|---------------|
| **Identificación y contacto** | Nombre, email, teléfono, cargo | `crm_contacts`, `crm_users`, empresas, actividades | Dato personal estándar |
| **Identificación tributaria** | RUT, razón social | Contactos, empresas, facturación SII | Identificador; puede vincularse a obligaciones comerciales |
| **Ubicación** | Dirección, región, comuna | Contactos, empresas, bodegas | Dato personal |
| **Laboral / organizacional** | Usuario, perfil, permisos, equipos | `crm_users`, membresías | Datos de trabajadores/colaboradores del cliente |
| **Comercial** | Oportunidades, cotizaciones, compras, notas | Varios `crm_*` | Contexto contractual |
| **Financiero-comercial** | Montos, facturas, cuentas bancarias, pagos | Facturas, `crm_bank_accounts` | Art. 13 — categoría con base de licitud específica; mayor exigencia en brechas (Art. 14 sexies) |
| **Credenciales** | Hash contraseña, TOTP, preguntas seguridad | `crm_users`, auth | No es “dato personal” en sentido habitual pero es crítico para seguridad |
| **Trazabilidad** | IP, user-agent, sesiones | `crm_user_auth_sessions` | Dato personal (identificable) |
| **Contenido libre** | Notas, archivos, bitácora, menciones | `crm_entity_notes`, `crm_entity_files` | Puede incluir datos sensibles **ingresados por usuarios** |
| **Marketing plataforma** | Lead «prueba gratis» (nombre, empresa, RUT, email, teléfono, dirección) | API marketing → CRM Atria | Responsable directo: operador de `koracrm.cl` |
| **Integraciones** | Leads/catálogo vía API key | `INTEGRACION-LEADS-API`, `INTEGRACION-CATALOGO-API` | El **cliente integrador** es responsable; Kora es encargado |
| **Fiscal SII** | Certificado `.p12` cifrado, CAF, XML tributarios | `sii.*` | Datos tributarios de la empresa cliente; alto riesgo |

### 3.2 Datos sensibles (Art. 2° letra g)

Kora **no está diseñado** para tratar de forma habitual salud, biométricos, orientación sexual, etc. **Riesgo residual:** campos libres (notas, archivos) donde un usuario podría ingresar datos sensibles sin controles.

### 3.3 Menores

No hay módulo específico para NNA. Si un contacto fuera menor de 14 años, aplicarían reglas reforzadas (Art. 16 quinquies) — hoy **sin salvaguardas en producto**.

---

## 4. Evaluación técnica actual de Kora (lo que ya ayuda al cumplimiento)

| Control | Estado en Kora | Referencia en repo |
|---------|----------------|-------------------|
| Aislamiento multi-tenant | ✅ Implementado | `tenant_id`, RLS (`20260613_multi_tenant_rls.sql`) |
| Permisos por módulo (RBAC) | ✅ Implementado | Perfiles de acceso, `require-permission` |
| Contraseñas con hash | ✅ `crypt()` / bcrypt | `auth.repository.ts` |
| 2FA TOTP (opcional) | ✅ Implementado | `UserTwoFactorPanel`, política por usuario |
| Soft delete + papelera | ✅ `deleted_at`, `archived_at` | Múltiples repositorios |
| Eliminación definitiva | ✅ Tras ~30 días en papelera | `*-archive.ts`, jobs purge |
| Purga tenant trial vencido | ✅ Implementado | `tenant-lifecycle.service.ts`, `tenant-purge.service.ts` |
| Cifrado credenciales SII | ✅ AES en BD | `sii-crypto.ts`, migraciones SII |
| HTTPS en producción | ✅ | `koracrm.cl`, wildcard SSL |
| Auditoría de registros | ✅ Parcial | `created_by_*`, `updated_by_*` en entidades |
| Copias de seguridad | ⚠️ Scripts documentados | `database/postgres/backup_*.sh` — procedimiento operativo a formalizar |
| Cifrado disco / BD en reposo | ⚠️ Depende de DO | Infraestructura, no código |
| Logs de acceso / SIEM | ❌ No centralizado | — |
| Módulo derechos ARSOPB | ❌ No existe | — |
| Política de privacidad | ❌ No publicada | — |
| Consentimiento en formularios | ❌ Trial sin checkbox | `TrialLeadForm.tsx` |

---

## 5. Checklist de cumplimiento

Leyenda:  
- ✅ **Cumple** o cubierto en gran medida  
- 🟡 **Parcial** — hay avance técnico u organizativo incompleto  
- ❌ **Pendiente** — no evidenciado  
- 🏢 **Organizacional** — no es solo desarrollo de software  
- ⚖️ **Legal** — requiere abogado / DPO  

---

### A. Gobernanza y roles (🏢 + ⚖️)

| # | Requisito | Responsable | Estado | Evidencia / gap en Kora |
|---|-----------|-------------|--------|-------------------------|
| A1 | Identificar quién es **responsable** vs **encargado** en cada flujo (tenant, plataforma, proveedores) | Operador Kora | 🟡 | Multi-tenant claro; falta matriz escrita y contratos |
| A2 | **Contrato / DPA** con cada cliente SaaS (encargo de tratamiento, Art. 15 bis) | Operador Kora | ❌ 🏢 | No hay plantilla en repo |
| A3 | **Contratos con subencargados** (DO, Mailtrap, mindic.cl, etc.) | Operador Kora | ❌ 🏢 | Hosting US/EU; correo transaccional |
| A4 | Designar **delegado de protección** (voluntario salvo modelo Art. 49) | Operador Kora | ❌ 🏢 | — |
| A5 | **Registro de Actividades de Tratamiento (RAT)** por responsable | Cada tenant + plataforma | ❌ 🏢 | No hay módulo ni plantilla en Kora |
| A6 | Mapa de **bases de licitud** por finalidad (CRM, facturación, marketing, trials) | Operador + tenants | ❌ ⚖️ | Uso intensivo de «contrato/interés legítimo» sin documentar |
| A7 | **Evaluación de Impacto (EIPD)** si tratamiento de alto riesgo | Operador Kora | ❌ 🏢 | Facturación SII + datos financieros sugiere EIPD |
| A8 | Programa de **cumplimiento** voluntario (Art. 49) — opcional pero atenuante | Operador Kora | ❌ 🏢 | — |

---

### B. Transparencia y políticas (Art. 14 ter)

| # | Requisito | Estado | Gap |
|---|-----------|--------|-----|
| B1 | Política de tratamiento publicada (versionada, fecha) | ❌ | Sin página en `koracrm.cl` ni en app |
| B2 | Identificación responsable + representante legal | ❌ 🏢 | — |
| B3 | Canal de contacto para ejercer derechos (email/formulario) | ❌ | No hay `privacidad@` ni flujo |
| B4 | Categorías de datos, finalidades, destinatarios, plazos conservación | ❌ | Inventario §3 es borrador interno |
| B5 | Bases de legitimidad por tratamiento | ❌ ⚖️ | — |
| B6 | Medidas de seguridad (descripción genérica pública) | 🟡 | Existen técnicamente; no documentadas al público |
| B7 | Derechos ARSOPB y recurso ante APDP | ❌ | — |
| B8 | Transferencias internacionales y garantías | ❌ | Servidor DO; posible correo EE.UU. |
| B9 | Decisiones automatizadas / perfiles | ✅ | Kora no hace scoring automatizado de personas |
| B10 | Información al titular **en el momento de la recolección** (no solo web) | ❌ | Clientes de tenants no reciben aviso desde Kora |
| B11 | **Aviso de privacidad para usuarios finales del CRM** (empleados del tenant) | ❌ | Login sin enlace a política del tenant |

**Recomendación producto:** página `/legal/privacidad` (plataforma) + configuración por tenant «Política de privacidad de mi empresa» mostrada en login o pie de app.

---

### C. Consentimiento y bases de licitud (Arts. 12–13)

| # | Requisito | Estado | Gap |
|---|-----------|--------|-----|
| C1 | Consentimiento en formulario **Prueba gratis** | ❌ | `TrialLeadForm` sin checkbox ni enlace |
| C2 | Registro de consentimiento (quién, cuándo, versión política) | ❌ | — |
| C3 | Base legal para datos de **contactos cargados por el tenant** | 🏢 tenant | Kora debe facilitar que el **cliente** documente su base (contrato, interés legítimo B2B, etc.) |
| C4 | Base legal para **integración Leads API** | 🏢 tenant | Documentar en `INTEGRACION-LEADS-API.md` obligación del integrador |
| C5 | Revocación de consentimiento operativa | ❌ | — |
| C6 | Tratamiento datos financieros / facturación (Art. 13) | 🟡 | Funcionalidad existe; falta declaración en política |

---

### D. Derechos ARSOPB (Arts. 7–11)

| # | Derecho | Estado producto Kora | Gap |
|---|---------|-------------------|-----|
| D1 | **Acceso** — copia de datos del titular | 🟡 | Admin puede ver ficha contacto; no hay export «pack titular» |
| D2 | **Rectificación** | ✅ | Edición de contactos/usuarios |
| D3 | **Supresión** | 🟡 | Archivar + eliminar definitivo contacto; no hay «borrado en cascada del titular» ni certificado |
| D4 | **Oposición** | ❌ | Sin flag «no contactar / oposición al tratamiento» |
| D5 | **Portabilidad** (JSON/CSV estructurado) | ❌ | Sin endpoint ni asistente |
| D6 | **Bloqueo** temporal | ❌ | Sin estado «bloqueado» distinto de archivado |
| D7 | Plazo **30 días** con workflow y prórroga | ❌ | Sin ticket/cola ni métricas |
| D8 | Mecanismo **expedito** (Art. 10) | ❌ | — |
| D9 | Herederos / fallecimiento (Art. 4°) | ❌ 🏢 | Procedimiento no definido |

**Recomendación producto (prioridad alta):** módulo **«Privacidad / Solicitudes titular»** por tenant: alta de solicitud, plazo, export JSON, registro de respuesta.

---

### E. Seguridad (Art. 14 quinquies)

| # | Medida | Estado | Notas |
|---|--------|--------|-------|
| E1 | Confidencialidad, integridad, disponibilidad | 🟡 | RLS + permisos; falta hardening documentado |
| E2 | Cifrado en tránsito (TLS) | ✅ | HTTPS |
| E3 | Cifrado en reposo (BD, backups, archivos) | 🟡 | SII cifrado; resto depende infra DO |
| E4 | Seudonimización / minimización | 🟡 | Snapshots `*_name` denormalizados — revisar necesidad |
| E5 | Control de acceso (menor privilegio) | ✅ | Perfiles por módulo |
| E6 | Gestión de vulnerabilidades / parches | 🟡 🏢 | Proceso operativo |
| E7 | Sesiones: token en `localStorage` + cookie | 🟡 | Valorar httpOnly-only, rotación, timeout |
| E8 | Registro de accesos administrativos | ❌ | — |
| E9 | Pruebas de restauración backup | 🟡 🏢 | Scripts existen; calendarizar |
| E10 | Capacitación confidencialidad personal con acceso a BD | ❌ 🏢 | Art. 14 bis |

---

### F. Brechas de seguridad (Art. 14 sexies)

| # | Requisito | Estado | Gap |
|---|-----------|--------|-----|
| F1 | Procedimiento interno de detección y escalamiento | ❌ 🏢 | — |
| F2 | Notificación a **APDP** sin dilación indebida | ❌ 🏢 | — |
| F3 | Notificación a **titulares** si riesgo elevado | ❌ 🏢 | — |
| F4 | Registro de incidentes (naturaleza, datos, titulares, medidas) | ❌ | — |
| F5 | Playbook para datos sensibles / financieros / menores | ❌ 🏢 | — |

---

### G. Encargados y transferencias internacionales (Arts. 15 bis, 27–29)

| # | Requisito | Estado | Proveedor Kora típico |
|---|-----------|--------|------------------------|
| G1 | Cláusulas encargo con clientes (tenants) | ❌ | — |
| G2 | Cláusulas con proveedores infra | ❌ | DigitalOcean (EE.UU.) |
| G3 | Cláusulas con correo transaccional | ❌ | Mailtrap / SMTP |
| G4 | Inventario subprocesadores publicado | ❌ | — |
| G5 | Transferencia solo con nivel adecuado o garantías | ❌ ⚖️ | Evaluar ubicación BD y correo |
| G6 | Documentar transferencias intragrupo (si aplica) | 🟡 | Atria ↔ tenants en misma BD |

---

### H. Conservación y supresión (Arts. 7°, 14 ter i)

| # | Requisito | Estado | Notas Kora |
|---|-----------|--------|------------|
| H1 | Política de retención **documentada** | ❌ 🏢 | Solo técnico: 30 días papelera |
| H2 | Eliminación al fin de la finalidad | 🟡 | Purga automática archivados; trials purgados |
| H3 | Supresión a solicitud del titular | 🟡 | Posible manualmente; sin proceso |
| H4 | Devolución/supresión al terminar contrato SaaS | 🟡 | `purgeTenantLikeExpiredTrial` — formalizar en offboarding |
| H5 | Conservación por obligación legal (facturas/SII) | 🏢 ⚖️ | Retención tributaria puede impedir borrado total |

---

### I. Datos de categorías especiales

| # | Requisito | Estado |
|---|-----------|--------|
| I1 | Datos sensibles — consentimiento expreso o base legal | ✅ N/A por diseño; 🟡 riesgo en notas/archivos |
| I2 | Menores < 14 años — protección reforzada | ❌ |
| I3 | Geolocalización (si se agregara) | ✅ N/A hoy |
| I4 | Biométricos | ✅ N/A (salvo futuro) |
| I5 | Infracciones penales en registros | ✅ N/A |

---

### J. Funcionalidades específicas del producto (checklist desarrollo)

| # | Funcionalidad sugerida | Prioridad | Estado |
|---|------------------------|-----------|--------|
| J1 | Página política privacidad plataforma + versión | Alta | ❌ |
| J2 | Consentimiento + registro en trial marketing | Alta | ❌ |
| J3 | Config: URL política privacidad del tenant | Alta | ❌ |
| J4 | Módulo solicitudes ARSOPB (cola, plazos, export) | Alta | ❌ |
| J5 | Export portabilidad contacto (JSON/CSV) | Alta | ❌ |
| J6 | Estado «oposición / no contactar» en contacto | Media | ❌ |
| J7 | Estado «bloqueado» vs archivado | Media | ❌ |
| J8 | Log de accesos a datos personales (quién vio qué) | Media | ❌ |
| J9 | Aviso en integraciones API (responsabilidad cliente) | Media | 🟡 doc API |
| J10 | Purga certificada «eliminar todos los datos del titular X» | Media | ❌ |
| J11 | DPIA template para clientes que usan FE SII | Media | ❌ 🏢 |
| J12 | Detección PII en notas (opcional) | Baja | ❌ |

---

### K. Documentación y operación para clientes (tenants)

Cada empresa que usa Kora como CRM de sus contactos **también es responsable** y debería:

| # | Acción del tenant | Kora puede ayudar con… |
|---|-------------------|------------------------|
| K1 | Publicar su propia política de privacidad | Campo URL + plantilla |
| K2 | Mantener su RAT | Export de metadatos del tenant |
| K3 | Atender ARSOPB en 30 días | Módulo solicitudes |
| K4 | Informar a sus contactos del tratamiento | Textos tipo / email plantilla |
| K5 | Firmar DPA con Kora | Contrato estándar SaaS |

---

## 6. Semáforo global (jun-2026)

| Dimensión | Nivel |
|-----------|-------|
| Seguridad técnica base (acceso, tenant, auth) | 🟢 Bueno |
| Minimización y retención operativa | 🟡 Parcial |
| Transparencia (14 ter) | 🔴 Insuficiente |
| Derechos del titular (ARSOPB) | 🔴 Insuficiente |
| Brechas y gobernanza | 🔴 Insuficiente |
| Encargados / transferencias | 🔴 Insuficiente |
| Preparación del cliente (tenant) | 🔴 Sin habilitadores en producto |

**¿Estamos cumpliendo la norma?** **No de forma integral.** Hay fundamentos técnicos útiles, pero **a 1-dic-2026 un auditor de la APDP encontraría brechas materiales** en políticas públicas, procedimientos ARSOPB, contratos de encargo y gestión de brechas. El riesgo es **compartido**: operador de Kora + cada tenant.

---

## 7. Plan de acción sugerido (hasta 1-dic-2026)

### Fase 1 — Jun–Jul 2026 (legal + crítico)

- [ ] ⚖️ Asesoría legal: matriz responsable/encargado, bases de licitud, EIPD facturación SII  
- [ ] 🏢 Redactar y publicar **Política de Privacidad** de la plataforma (Art. 14 ter)  
- [ ] 🏢 Plantilla **DPA / anexo tratamiento** para clientes SaaS  
- [ ] Producto: consentimiento en `TrialLeadForm` + registro timestamp  
- [ ] Producto: página legal + enlace en marketing y login  

### Fase 2 — Ago–Sep 2026 (derechos del titular)

- [ ] Producto: módulo **Solicitudes de privacidad** (ARSOPB) por tenant  
- [ ] Producto: export JSON/CSV portabilidad por contacto  
- [ ] 🏢 Procedimiento interno 30 días + responsable por tenant  
- [ ] Documentar subprocesadores (DO, Mailtrap, etc.)  

### Fase 3 — Oct–Nov 2026 (seguridad y brechas)

- [ ] 🏢 Plan de respuesta a incidentes + plantilla notificación APDP  
- [ ] RAT inicial plataforma + guía para tenants  
- [ ] Revisión sesiones (httpOnly), backups cifrados, pentest ligero  
- [ ] Instrucciones APDP cuando existan (estándares PYME Art. 14 septies)  

### Fase 4 — Dic 2026

- [ ] Verificación pre-vigencia + capacitación equipo  
- [ ] Comunicación a clientes existentes (nuevas obligaciones / DPA)  

---

## 8. Boletín 18.060-07 — qué vigilar

Proyecto en Senado (ene-2026) que **podría** cambiar antes de diciembre:

- Reducción de multas  
- Ajuste datos sensibles y fuentes de acceso público  
- Cambios en bloqueo, portabilidad, transferencias intragrupo  
- Flexibilización obligaciones responsables extranjeros  

**Implicancia:** mantener el checklist **alineado al texto publicado**, pero revisar trimestralmente si el boletín avanza. No suspender la adecuación esperando su aprobación.

---

## 9. Disclaimer

Este documento es un **análisis técnico-organizacional interno** basado en fuentes públicas y el estado del repositorio Kora CRM. **No reemplaza** revisión por abogados especializados en protección de datos ni representa una auditoría de cumplimiento. Los plazos y multas deben confirmarse contra el [texto actualizado en Ley Chile](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

---

## 10. Control de versiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-06-05 | Análisis interno Kora | Versión inicial |
