# T-23: reestructuración al enfoque CPPP

## Motivo y alcance

En octubre de 2026 GestionCapa cambió de una plataforma genérica para
organizaciones al subdominio de capacitaciones del Colegio Profesional de
Profesores del Perú – Región Cusco (CPPP). Se descartó el enfoque minero.
La decisión procede de la entrevista al representante del CPPP y de la
Actividad de stakeholders, según T-23 / SCRUM-121 proporcionada por el equipo.

Esta tarea fija el enfoque del producto, el vocabulario y la planificación.
La implementación de cada historia y de las integraciones se sigue en
[la matriz de requisitos](../enfoqueCppp.md). Tener una pantalla de demostración
no acredita un servicio operativo ni permite cerrar la historia correspondiente.

## Referencias de diseño

- [Sitio institucional del CPPP](https://www.cpppregion-cusco.com/): referencia de identidad.
- [Diseño indicado en T-23](https://www.figma.com/design/ORSusbg35vcu0nUEz4o08q).
- [Contrato local de las pantallas](pantallas-figma.md): conserva la referencia
  a la copia utilizada por el frontend; no acredita sincronización con el original.

El frontend reutiliza la insignia en `frontend/src/assets/insignia-cppp.png`,
la configuración institucional de `frontend/src/lib/cppp.ts`, el encabezado,
el pie y los estilos existentes. La pestaña y la portada ya identifican al CPPP.
La referencia institucional se pudo consultar el 07/11/2026; el diseño de Figma
no fue accesible mediante la herramienta de consulta. La conformidad visual
completa debe validarse con el equipo que tiene acceso al diseño.

## Lenguaje y compatibilidad

| Concepto del producto | Contrato técnico conservado | Uso |
|---|---|---|
| Agremiado o colegiado | `PARTICIPANTE`, rol SQL `participante`, rutas `/participante` | Nombre visible Agremiado; usuario que consulta cursos, se inscribe y registra asistencia |
| Instructor | `INSTRUCTOR`, rol SQL `instructor` | Docente asignado al curso o sesión |
| Administrador del CPPP | `ADMIN`, rol SQL `admin` | Gestión institucional |
| Coordinador del Sprint 1 | `COORDINADOR`, rutas `/coordinador` | Compatibilidad de las funciones existentes; no es un nuevo rol requerido por el CPPP |
| Curso y sesión | `cursos` y `classes` | La clase programada se conserva y puede asociarse a un curso |
| Organización CPPP | `organization_id`, `cpppOrganizacionId` | Ámbito técnico para permisos y catálogo; no supone ofrecer un producto genérico a otras organizaciones |

No se renombran tablas, migraciones aplicadas, rutas ni códigos de rol de forma
masiva. Esto evita romper sesiones, inscripciones y datos del Sprint 1.
«Participante» sigue siendo válido como concepto de una videoconferencia;
no se reemplazan los nombres de tipos ni los contratos de Jitsi.
Los correos y credenciales demo conservan sus valores para compatibilidad con
las pruebas y no representan cuentas oficiales del colegio.

## Necesidades y límites de integración

| Necesidad del CPPP | Seguimiento | Condición para aprobarla |
|---|---|---|
| Pasarela, depósito BCP verificado y efectivo | RF-22 a RF-25 | Pasarela aprobada, reglas de comisión, revisión de vouchers y confirmación persistente; nunca almacenar tarjetas |
| Certificados con QR | HU-20 / SCRUM-26; RF-26 a RF-30 | Validar las reglas con el CPPP, emisión persistente, código único, firma autorizada y verificación pública |
| Videoconferencia propia | RF-17, RF-18 y RNF-19 | Jitsi propio desplegado y pruebas de acceso, pantalla exclusiva del anfitrión, expulsión y asistencia |
| Padrón de afiliados | RF-05 y RNF-20 | Contrato de acceso y validación de habilitación sin convertir datos demo en afiliados reales |
| Servidor propio bajo subdominio | RNF-01 y RNF-26 | Servidor, DNS, HTTPS y entorno aprobados; la URL sugerida no equivale a un despliegue |

Las reglas de HU-20 están pendientes de validación institucional. Los valores
actuales de demostración o las reglas de asistencia ya implementadas no
sustituyen esa aprobación. No se inventan certificados oficiales, firma del
Decano, pagos confirmados ni afiliaciones habilitadas.

## Planificación del producto

| Periodo | Prioridad indicada en T-23 | Evidencia para cierre |
|---|---|---|
| Sprint 2, 27/10–09/11/2026 | Certificados con QR | Revisión de HU-20 y pruebas de emisión, permisos, descarga y verificación según el alcance aprobado |
| Sprint 3, antes del evento de fines de noviembre de 2026 | Pagos y sesiones virtuales seguras | Integración de pagos y despliegue/pruebas del servidor propio de videoconferencia |

El documento no indica las fechas exactas del Sprint 3 ni del evento: no se
asignan fechas nuevas. Las [etapas técnicas](../../tasks/plan.md) organizan el
trabajo y sus dependencias; no sustituyen el calendario del backlog.
La certificación del Sprint 2 puede avanzarse con pruebas de las condiciones
previas; la confirmación real de pagos necesita su integración del Sprint 3.
Hasta entonces no se considera aprobada la certificación integral de cursos con costo.

## Backlog y evidencia externa

T-23 informa que se renombraron épicas e historias con el lenguaje del colegio,
se registraron los puntos del Planning Poker del Lab 5, se añadieron HU-33,
HU-34, HU-35 y T-20 a T-22, y se refinaron HU-26 y HU-32.
Estos hechos se registran como información aportada por el equipo, no como
operaciones realizadas desde este repositorio.

Falta adjuntar o enlazar evidencia del tablero para verificar títulos, puntos,
criterios refinados y asignación a sprints. No se inventan puntos ni el contenido
de historias/tareas cuyo detalle no se ha proporcionado. La existencia del
código no acredita que el tablero haya sido actualizado.

## Conservación del Sprint 1

| Función conservada | Evidencia del repositorio |
|---|---|
| Inicio y cierre de sesión | `backend/src/modules/auth`, pruebas `roles.test.ts` y `seguridadAcceso.test.ts` |
| Acceso por rol | `backend/src/plugins/permisos.ts`, pruebas `autorizacion.test.ts` e integración `permisos.test.ts` |
| Programación de clases | `backend/src/modules/clases`, integración `clases.test.ts` y `solapamiento.test.ts` |
| Inscripción | Integración `inscripcion.test.ts` y `catalogo.test.ts` |
| QR rotatorio | `backend/src/modules/qr`, pruebas `qr.test.ts` |
| Registro de asistencia | `backend/src/modules/asistencia`, integración `asistencia.test.ts` |

T-23 no retira estas funciones ni modifica los permisos para aprobar historias
posteriores. La adaptación local se puede revisar con este documento, la matriz,
el mapa de rutas y las pruebas existentes. El cierre completo en el tablero
requiere además la evidencia externa de diseño, backlog y validación institucional.
