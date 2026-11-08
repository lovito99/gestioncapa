# Adaptación al CPPP y trazabilidad

Fuente: T-23 (SCRUM-121) y Requisitos GestionCapa CPPP, versión 4.0 del
27/10/2026, transcritos por el usuario. Revisión del repositorio: 07/11/2026.
El cambio de producto, la planificación y sus evidencias se detallan en
[T-23](esp/reestructuracionCppp.md).
El alcance solicitado es implementar todos los requisitos por etapas, según
[tasks/plan.md](../tasks/plan.md); este documento no declara terminado el sistema.

El producto es el subdominio de capacitaciones del Colegio Profesional de
Profesores del Perú – Región Cusco. Se conserva el código `PARTICIPANTE` para
compatibilidad y se muestra **Agremiado**. `COORDINADOR` es compatibilidad del
Sprint 1; no se introduce como un cuarto rol requerido por el CPPP.
La identidad reutiliza la insignia y los componentes existentes. Referencia
institucional: [sitio del CPPP](https://www.cpppregion-cusco.com/).
Los datos de demostración no son afiliados ni constancias oficiales.

## Estados

- **Implementado**: hay comportamiento persistente en servidor; no implica aprobación de producción.
- **Parcial**: existe una parte real, falta el resto indicado.
- **Demo**: interfaz o simulación MSW; no acredita integración real.
- **Pendiente**: no hay evidencia suficiente para aprobar el requisito completo.

Las referencias son relativas a la raíz. Las etapas indican dónde cerrar la
brecha, incluso cuando ya existe una parte de una etapa posterior.

## Requisitos funcionales

| ID | Estado | Evidencia y brecha | Etapa |
|---|---|---|---|
| RF-01 | Implementado | `backend/src/modules/auth`: bcrypt, login JWT y logout con revocación en Redis | 1 |
| RF-02 | Pendiente | Faltan recuperación por correo, token de un uso y actualización real del perfil | 2 |
| RF-03 | Implementado | `backend/src/plugins/permisos.ts`, guard y rutas protegidas; Agremiado visible, códigos heredados conservados | 1 |
| RF-04 | Pendiente | No hay CRUD persistente completo de usuarios, desactivación y cambios de rol auditados | 2 |
| RF-05 | Pendiente | Inscripción valida usuario activo local, no habilitación en el padrón del CPPP; falta contrato del padrón | 2 |
| RF-06 | Pendiente | Falta gestión real de sedes y provincias | 2 |
| RF-07 | Implementado | `/` y `/capacitaciones`; `GET /api/publico/cursos` sin token, paginado, solo publicados vigentes | 1 |
| RF-08 | Parcial | `backend/src/modules/cursos`: creación, publicación, módulos, materiales, horas, cupos y certificados; edición de la UI aún necesita persistencia completa | 3 |
| RF-09 | Parcial | Categorías fijas de Sprint 2 en `cursos.categorias.ts`; falta gestión HU-15 y etiquetas | 3 |
| RF-10 | Implementado | Catálogo paginado, búsqueda sin tildes, modalidad y categoría; pruebas `catalogo.test.ts` | 1/3 |
| RF-11 | Parcial | Transacción y bloqueo de última plaza; HU-16 añade reserva pendiente para cursos con costo. Faltan padrón y confirmación real del pago | 2/5 |
| RF-12 | Implementado | Sesiones por curso, horarios y rechazo de solapamientos; pruebas `sesionesCurso` y `solapamiento` | 3 |
| RF-13 | Parcial | Programación de clases existente; faltan avisos persistentes y correo al cancelar/reprogramar | 3 |
| RF-14 | Implementado | `backend/src/modules/qr`, QR firmado rotatorio de 30 segundos | 3 |
| RF-15 | Implementado | Registro móvil y persistencia por colegiado/sesión; pruebas de asistencia | 3 |
| RF-16 | Parcial | Consulta de administración/coordinador; instructor todavía necesita autorización por sesión propia | 3 |
| RF-17 | Parcial | Rutas y credenciales Jitsi; falta despliegue propio y validar pantalla exclusiva, expulsión y acceso por inscripción en servidor Jitsi | 7 |
| RF-18 | Pendiente | Falta asistencia virtual persistente y validada por eventos confiables del servidor | 7 |
| RF-19 | Demo | Avance/estado mostrado no sustituye persistencia y finalización de contenidos | 4 |
| RF-20 | Pendiente | Faltan evaluaciones, respuestas, intentos y cálculo de notas en servidor | 4 |
| RF-21 | Pendiente | Falta autorización auditada de intento adicional | 4 |
| RF-22 | Pendiente | Falta pasarela aprobada, comisión, confirmación firmada e idempotencia; no se almacenarán tarjetas | 5 |
| RF-23 | Pendiente | Falta carga privada de voucher BCP, revisión, motivo y auditoría | 5 |
| RF-24 | Pendiente | Falta registro real de efectivo con permisos y auditoría | 5 |
| RF-25 | Pendiente | HU-16 mantiene cursos con costo pendientes. Faltan confirmación real por pago, notificación y comprobante | 5 |
| RF-26 | Parcial | HU-20 emite constancias presenciales gratuitas con 80 %; faltan nota, pago y otras modalidades | 6 |
| RF-27 | Implementado | HU-20: excepción persistente con motivo, actor y fecha; documento de demostración | 6 |
| RF-28 | Parcial | Historial descarga archivos almacenados con permisos; falta emisor oficial PDF/QR y firma autorizada del Decano | 6 |
| RF-29 | Implementado | HU-20: verificación pública persistente de válido, anulado o reemplazado, sin DNI ni nota | 6 |
| RF-30 | Implementado | HU-20: anulación persistente con motivo y auditoría | 6 |
| RF-31 | Parcial | Historial real de cursos, sesiones y archivos en `backend/src/modules/historial`; pagos requieren módulo real | 8 |
| RF-32 | Pendiente | Falta definir y persistir cómputo de horas acumuladas válidas HU-34 | 8 |
| RF-33 | Parcial | Listado restringido de colegiados en historial; faltan búsqueda por nombre/DNI y paginación en servidor | 8 |
| RF-34 | Pendiente | PDF individual no sustituye reportes agregados de inscritos, asistencia, pagos y certificados en PDF/Excel | 8 |
| RF-35 | Parcial | Existen paneles y listas por rol; faltan pendientes consolidados reales | 8 |
| RF-36 | Pendiente | Faltan notificaciones persistentes y entrega por SMTP; no marcar envíos inexistentes | 3/5/6 |
| RF-37 | Pendiente | Falta foro por sesión con permisos, paginación y moderación | 4 |

## Requisitos no funcionales

| ID | Estado | Evidencia y brecha | Etapa |
|---|---|---|---|
| RNF-01 | Pendiente | Compose existente no acredita servidor Ubuntu, DNS ni HTTPS del CPPP | 8 |
| RNF-02 | Pendiente | Falta servidor contratado y medición de costo; no se afirma que Jitsi quepa en 5 USD/mes | 7/8 |
| RNF-03 | Parcial | Insignia, encabezado, pie, colores y tipografías CPPP; falta validación institucional del diseño completo | 1/8 |
| RNF-04 | Parcial | UI y errores principales en español; revisar flujos nuevos y mensajes de proveedores | Todas |
| RNF-05 | Parcial | Catálogo público probado a 360 px; falta revisar todas las pantallas | 8 |
| RNF-06 | Parcial | Flujo QR móvil existente; medición completa de tres toques y diez segundos pendiente | 8 |
| RNF-07 | Pendiente | Chromium automatizado no acredita dos últimas versiones de los cuatro navegadores ni Safari iOS real | 8 |
| RNF-08 | Pendiente | Falta prueba reproducible de 100 usuarios concurrentes con p95 menor a 2 s en entorno objetivo | 8 |
| RNF-09 | Pendiente | Falta monitorización y evidencia de disponibilidad 99 % entre 07:00 y 22:00 Lima | 8 |
| RNF-10 | Pendiente | Falta respaldo diario y restauración comprobada antes de operación | 8 |
| RNF-11 | Implementado | bcrypt, JWT con expiración y revocación hasta su vencimiento en Redis; pruebas `seguridadAcceso.test.ts` | 1 |
| RNF-12 | Implementado | Matriz de permisos, usuario activo consultado en servidor y autorización por objeto; mantener en cada endpoint nuevo | Todas |
| RNF-13 | Implementado | Cinco fallos en ventana de 15 minutos bloquean otros 15 minutos; límite por usuario compartido entre tokens y procesos, en Redis | 1 |
| RNF-14 | Parcial | Zod, secretos externos y CORS limitado a FRONTEND_URL también en desarrollo; mantener validaciones en futuras entradas | Todas |
| RNF-15 | Parcial | Historial/PDF ocultan DNI y restringen acceso; falta política del tratamiento y revisión institucional. No se declara cumplimiento legal integral | 2/6/8 |
| RNF-16 | Implementado | QR firmado vence a los 30 s; una persona no registra dos asistencias a la misma sesión. El QR compartido sirve a distintos inscritos | 3 |
| RNF-17 | Implementado | HU-20: códigos criptográficos de 128 bits y unicidad en base | 6 |
| RNF-18 | Pendiente | No hay integración real de pasarela; implementar sin recibir ni guardar datos de tarjeta | 5 |
| RNF-19 | Parcial | Preparación Jitsi existente; servidor propio pendiente | 7 |
| RNF-20 | Pendiente | Falta contrato de padrón y referencia externa; no copiar su información como otra fuente de verdad | 2 |
| RNF-21 | Pendiente | Falta auditoría persistente común para roles, pagos, excepciones y anulaciones | 2/5/6 |
| RNF-22 | Implementado | Fastify/Pino: logs estructurados, requestId y errores; mantener exclusión de secretos | Todas |
| RNF-23 | Parcial | Catálogo paginado y acotado; quedan listas de colegiados e historial sin paginar | 3/8 |
| RNF-24 | Parcial | Etiquetas, foco, estados y navegación por teclado en componentes; auditoría WCAG 2.1 AA completa pendiente | 8 |
| RNF-25 | Pendiente | Pruebas automáticas disponibles; PR, revisión por otra persona e integración a main son manuales | Todas |
| RNF-26 | Parcial | Docker Compose y validación de entorno existentes; falta levantar y validar despliegue completo en servidor objetivo | 8 |

## Contrato de la primera etapa

- La portada muestra datos públicos, sin abrir módulos, documentos ni historiales.
  Los detalles privados y la inscripción siguen requiriendo sesión.
- Se omiten borradores, cursos de otra organización y cursos con fecha final
  anterior al día actual en Lima. Sin fecha final se muestran como fechas por confirmar.
- `cpppOrganizacionId` selecciona la organización pública, por defecto `1`.
  No se acepta una organización enviada por el visitante.
- El logout revoca únicamente el token enviado; otras sesiones conservan su validez.
  Cada login emite un `jti` distinto. La revocación dura hasta la expiración del JWT.
- Cinco contraseñas incorrectas en 15 minutos bloquean la cuenta otros 15 minutos,
  incluida una contraseña correcta. El intento posterior no prolonga el bloqueo.
  El servidor responde `423 ACCESO_BLOQUEADO` y `Retry-After` en segundos.
- `limitePeticiones` admite 1–10000, por defecto 300 solicitudes autenticadas por
  usuario en una ventana de 60 segundos. Se comparte entre sesiones/instancias
  que usan la misma base y Redis; superar el límite devuelve `429` y `Retry-After`.
- Los contadores y revocaciones dependen de Redis. Un fallo de Redis no permite
  saltar los controles. Las claves usan el nombre de base como ámbito y un hash
  del correo/token, sin guardar esos valores en claro.
- Mantener Redis disponible y sus revocaciones al reiniciar/desplegar. Vaciar o
  perder sus datos antes del vencimiento de los JWT puede reactivar tokens
  revocados; el despliegue debe preservar datos y probar recuperación.
- CORS anuncia únicamente `FRONTEND_URL`; para otros puertos de desarrollo se
  configura esa variable. CORS no sustituye autenticación ni controles del servidor.

## Dependencias que el documento no proporciona

Antes de conectar servicios reales se necesitan contrato y ambiente de prueba
API/esquema del padrón; pasarela aprobada y reglas de comisión/reembolso;
cuenta BCP y validación de vouchers; SMTP; acceso al servidor/DNS; firma autorizada
del Decano y confirmación de HU-20. Configurar secretos únicamente en `.env`
locales o el gestor de secretos del despliegue, nunca en el chat ni el repositorio.
HU-50 enlaza el aviso institucional indicado por el usuario y registra su
aceptación. Esto no acredita por sí solo cumplimiento legal integral.

La continuación independiente es completar los módulos locales de las etapas
2–4; sus pruebas pueden usar adaptadores de prueba explícitos. La integración
con servicios y la aprobación de producción quedan pendientes de esos contratos.


## Verificación de la primera entrega

- `npm run typecheck` y `npm run e2e:tipos`: aprobados.
- `npm test`: 255 pruebas backend, 55 frontend y 3 del servidor frontend aprobadas.
- Integración completa: 215 pruebas aprobadas con PostgreSQL/Redis, en una base
  temporal creada para esta entrega y eliminada al finalizar.
- Playwright: 29 recorridos aprobados de catálogo público, acceso y navegación;
  uno conectado al backend real. Las pruebas públicas a 360 px comprobaron que
  no hubiera desplazamiento horizontal.
- Mutación: permitir el sexto fallo en vez del quinto rompe la prueba de bloqueo;
  se restauró el código original y se volvieron a aprobar sus cuatro pruebas.
- `npm run lint -w frontend`: sin errores; dos advertencias ya presentes sobre
  regex de control en `pdfTexto.ts` y estado sincronizado en efecto del catálogo.
- `git diff --check`: sin errores. No se ejecutaron builds ni operaciones Git de
  escritura. Quedan build manual, revisión humana del PR y validaciones de
  producción/navegadores de las etapas siguientes.


## HU-50

El registro público con DNI dejó de ser únicamente demo: ahora persiste cuentas,
contraseñas bcrypt y auditoría con fecha, e inicia sesión. Véase [HU-50](esp/registro.md).
La recuperación automática por correo (RF-02), el padrón (HU-33) y cuentas externas
(HU-43) conservan sus estados pendientes.


## HU-16

La inscripción en línea distingue confirmación gratuita y reserva pendiente de
pago, sin modificar estados históricos. Véase [HU-16](esp/inscripcionCurso.md).
El padrón (HU-33) y el procesamiento/confirmación de pagos (HU-32) siguen pendientes.


## HU-20

El alcance Sprint 2 se implementa con [constancias de demostración persistentes](esp/certificados.md),
QR verificable, privacidad, excepciones, anulación y corrección auditadas. El
usuario autorizó firmas genéricas por el momento; no se emiten documentos oficiales.
Se mantienen fuera del alcance los pagos, modalidades avanzadas y exámenes de
los sprints posteriores.
