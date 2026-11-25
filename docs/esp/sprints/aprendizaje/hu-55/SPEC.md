# HU-55 · Lecciones en orden en un curso grabado

Estado: implementada, pendiente de build manual. Sprint provisional Aprendizaje. Jira: SCRUM-215.

## Objetivo

Un colegiado con acceso vigente a un curso grabado puede completar sus videos
obligatorios en el orden del aula. El aula le indica cuál debe terminar para
habilitar el siguiente. El servidor controla la consulta, la reproducción y la
entrega del cuestionario de salida aunque el colegiado entre por un enlace directo.

| Capacidad | Resultado esperado | Depende de |
| --- | --- | --- |
| Secuencia | El servidor determina qué video obligatorio puede abrir el colegiado. | Orden de los materiales y finalización de HU-17. |
| Acceso y aula | La lista muestra el requisito y la consulta directa aplica la misma regla. | Secuencia y autorización del curso. |
| Cuestionario | HU-19 habilita la salida cuando se completan los videos exigidos. | Finalización de la secuencia e inscripción vigente. |

## Código actual e inconsistencias

| Superficie | Comportamiento comprobado | Implicación para HU-55 |
| --- | --- | --- |
| Avance HU-17 | `avanceRepository.listarAvance` ordena por `modulos_curso.orden, materiales_curso.id`, devuelve las URL y lee `finalizacionesContenido`. `avanceService` valida inscripción y registra el umbral del 90 % en milisegundos de reproducción. | Reutilizar el orden, el umbral y la finalización. Añadir una decisión de acceso antes de revelar la fuente o aceptar avance de una lección. |
| Enlace directo y ficha | `avanceController` tiene operaciones de reproducción y progreso, y carece de consulta individual. `cursosService.detalle` expone URLs de materiales a quienes tienen acceso al contenido. `DetalleCursoPagina` enlaza videos directamente. | Incorporar la consulta individual y revisar las proyecciones de avance, ficha y evaluaciones para que la fuente de una lección bloqueada no salga por otra ruta. |
| Evaluación HU-19 | El cuestionario oficial conserva una lista de videos al publicarse. `resumenEvaluacion` usa esa lista y `finalizacionesContenido`. El detalle y la entrega rechazan con `409 LECCIONES_PENDIENTES`; la lista del aula también devuelve las URL de las lecciones históricas. | Una salida publicada antes de activar HU-17 puede cubrir solo un subconjunto del aula medida. La consulta y la rendición deben exigir también la secuencia vigente, incluso si la lista publicada ya está completa. |
| YouTube HU-37 | `AulaLeccionesYoutube` muestra un iframe y permite marcar la lección como completada. `estadoLeccionesYoutube` registra esa marca por separado. HU-37 definió estos videos y PDF como material complementario. | El estado manual de YouTube carece de la evidencia de reproducción exigida por HU-55. Incluirlo como requisito obligaría a revisar el alcance de HU-37 y la forma de medir. |

Fuentes del repositorio: [HU-17](../hu-17/SPEC.md), [HU-19](../hu-19/SPEC.md),
[HU-37](../hu-37/SPEC.md) y [vista de finalizaciones](../../../../../backend/migraciones/0045-sesionesAvance.sql).

## Reglas de funcionamiento

1. **Contenido de la secuencia.** Aplicarla al contenido de tipo video, obligatorio
   y medible de cursos grabados con HU-17 activado. Mantener el modo histórico de
   HU-19 en cursos sin medición hasta que se preparen y activen por el flujo
   existente. Los videos y PDF complementarios de HU-37 y los recursos sueltos
   mantienen sus reglas de acceso. Los cursos en otras modalidades conservan sus
   flujos.
2. **Orden y desbloqueo.** Usar el orden establecido por módulo y, dentro de él,
   por identificador de material. Los videos del tramo inicial completado y el
   primer pendiente quedan accesibles. Los posteriores muestran el título del
   primer pendiente anterior que impide abrirlos. Si hay finalizaciones válidas
   registradas fuera de orden, conservarlas y aplicar el mismo requisito de
   acceso hasta completar el tramo anterior. El bloqueo se calcula por titular
   en cada consulta. No se añade un estado persistido ni se cambia la edición
   del orden como parte de esta historia.
3. **Umbral.** Para una finalización nueva, utilizar el 90 % de los milisegundos
   acreditados por HU-17 sobre la duración confirmada. La posición del
   reproductor y el porcentaje global son informativos. Las finalizaciones
   históricas compatibles que ya reconoce `finalizacionesContenido` conservan
   su fecha y validez. Conservan su comportamiento la pausa, la reanudación y
   la limitación de adelanto de HU-17.
4. **Entrega de contenido.** El alumno ve título, estado, duración disponible y
   requisito al listar una lección bloqueada. La fuente se entrega al consultar
   una lección habilitada. La ficha del curso remite al aula en vez de publicar
   enlaces al video obligatorio. La autorización se vuelve a evaluar al
   iniciar reproducción y guardar progreso; una respuesta 403 no entrega URL
   ni modifica el avance. La regla se aplica por material del aula. Si el
   instructor reutiliza una misma fuente como recurso independiente, ese
   recurso conserva su acceso propio y verlo no acredita otro material. Los
   enlaces externos se rigen por los controles de su proveedor.
5. **Salida oficial.** Exigir una lista académica no vacía y la finalización de
   todos los videos de la secuencia medida y de los requisitos publicados de
   HU-19. Aplicar la regla en listado, detalle y entrega para esa salida,
   conservando el estado de intentos de HU-19. El reenvío idéntico de una
   operación registrada devuelve su nota anterior sin consumir otro intento.
   Las notas, intentos y certificados ya registrados conservan su validez.
   En cursos históricos la salida sigue tomando como referencia su lista publicada.

**Alcance aprobado.** HU-55 ordena los videos obligatorios medibles de HU-17.
Incorporar los videos de YouTube de HU-37 a la secuencia obligatoria requeriría
acordar una fuente autorizada de reproducción y evidencia válida del 90 %.
El IFrame Player API
informa posición y duración, y Google establece condiciones para derivar
métricas de sus datos.
[Referencia del reproductor](https://developers.google.com/youtube/iframe_api_reference) ·
[Política de desarrolladores](https://developers.google.com/youtube/terms/developer-policies)

## Contrato

| Operación | Comportamiento |
| --- | --- |
| `GET /api/cursos/:id/avance/:usuarioId` | Mantiene el resumen. Cada video en la secuencia declara `bloqueo: null` o `bloqueo: { leccionId, titulo }`. `url` queda en `null` para los videos de la secuencia y el detalle autorizado entrega la fuente. |
| `GET /api/cursos/:id/avance/materiales/:materialId` | Consulta individual autenticada con el actor como titular. Éxito para la lección habilitada. `403 LECCION_BLOQUEADA` para la lección bloqueada de un curso al que sí tiene acceso, con el título que debe completar; el error general de permiso se conserva fuera de ese caso. Un identificador que no pertenece al curso devuelve 404 después de validar acceso. |
| `POST .../materiales/:materialId/reproducir` y `POST .../materiales/:materialId/progreso` | Aplican el control anterior antes de abrir una sesión de reproducción o acreditar progreso. |
| `GET /api/cursos/:id` y `GET /api/cursos/:id/evaluaciones` | Las proyecciones del alumno dejan de divulgar la fuente de los videos que gestiona la secuencia. La administración del curso conserva sus datos de gestión. |
| `GET .../evaluaciones/:evaluacionId` y `POST .../evaluaciones/:evaluacionId/intentos` | Mientras falten lecciones obligatorias, el detalle y los intentos nuevos devuelven `409 LECCIONES_PENDIENTES`. El reenvío idéntico solo devuelve el resultado de su operación ya registrada. |
| `/cursos/:id/aula/lecciones/:materialId` | Enlace interno al aula con la lección seleccionada. Obtiene el detalle en el servidor. Un 403 muestra el requisito y permite volver a la lista. |

El estado personal usa las políticas existentes de autenticación, inscripción y
cobro. Las respuestas de avance y detalle de lección se sirven con
`Cache-Control: private, no-store`. Los bloqueos de PostgreSQL se adquieren
en el orden existente de curso e inscripción antes de comprobar o escribir,
para mantener coherencia entre la finalización, la apertura y la rendición.
[Bloqueos de filas en PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html)

## Criterios de aceptación

| ID | Comprobación |
| --- | --- |
| HU55-01 | En un curso medido con A, B y C en ese orden y A pendiente, A puede abrirse. B y C muestran candado y «Completa A para habilitar esta lección». Funciona entre módulos y con teclado. |
| HU55-02 | Con menos del 90 % de A acreditado, B sigue bloqueada. Al alcanzar el 90 % y confirmar el guardado, B queda habilitada al volver o recargar el aula. El estado se conserva al abrir otra sesión del mismo titular. |
| HU55-03 | El enlace directo a B recibe 403 del servidor mientras B está bloqueada. La URL del video no aparece en el error ni en las proyecciones del alumno. Iniciar o reportar reproducción de B también recibe 403 y no genera progreso. Otro titular no hereda el avance. |
| HU55-04 | La salida oficial queda bloqueada hasta completar todos los videos exigidos, incluido el caso en que una lista de salida anterior cubría solo una parte. La API no entrega preguntas ni consume intentos durante el bloqueo. Con el último requisito completo, permite rendir bajo las reglas de HU-19. |
| HU55-05 | Se conservan fechas y avances históricos, resultados y certificados ya registrados, permisos vigentes y comportamiento de cursos no medidos, otras modalidades y materiales complementarios. Un registro finalizado después de un hueco previo no permite saltar dicho hueco. |

## Soluciones existentes

| Capacidad | Búsqueda y candidatos | Decisión y justificación |
| --- | --- | --- |
| Orden y finalización | Repositorio: `avanceRepository.listarAvance`, `finalizacionesContenido`, `alcanzaUmbral` y transacciones. npm/GitHub: XState 5.33.4 (MIT, 7 nov 2026, sin dependencias directas) y `pg` 8.23.1 (MIT, 30 sep 2026), fechas de versiones del catálogo. | **Construir** solo la regla del primer pendiente sobre las filas ordenadas y el cliente `pg` ya fijado. XState modela transiciones, pero no resuelve el acceso transaccional ni los datos históricos. No se agrega una dependencia. [XState](https://github.com/statelyai/xstate) · [node-postgres](https://github.com/brianc/node-postgres) · [Funciones de ventana de PostgreSQL](https://www.postgresql.org/docs/17/functions-window.html) |
| Control y proyecciones de acceso | Repositorio: controladores de avance y cursos, política `tieneAccesoCurso`, DTO y `ErrorAplicacion`. npm/GitHub: CASL 7.1.3 (MIT, 13 nov 2026, una dependencia directa, `@ucast/mongo2js`). | **Extender** la autorización y la proyección actuales con la decisión de secuencia. CASL permite expresar permisos, pero no conoce la inscripción, la finalización ni la transacción que decide el acceso. [CASL](https://github.com/stalniy/casl) |
| Lista, candado y recarga | Repositorio: `AulaContenido`, `ResumenContenido`, `Etiqueta`, `Aviso`, `Boton`, icono de Lucide (ISC, instalado) y consultas TanStack. Astryx: `List`, `Badge`, `Banner` y plantilla `course-detail`. npm/GitHub: Astryx Core 0.7.17 (MIT, 20 nov 2026, `intl-messageformat` directa y pares React, React DOM y StyleX), React Query 5.108.4 (MIT, 23 nov 2026, `query-core` directa y React par), Radix Tooltip 1.4.1 (MIT, 12 oct 2026, 14 dependencias directas). | **Componer** la lista accesible con componentes existentes y las consultas TanStack ya utilizadas. Usar Astryx como referencia para distinguir filas navegables, mostrar estado y comunicar cambios. El texto del requisito es persistente y visible, por lo que un tooltip no cubre el caso. La plantilla aporta la organización del temario. [React Query](https://github.com/TanStack/query) · [Radix](https://github.com/radix-ui/primitives) · [Astryx Core en npm](https://www.npmjs.com/package/@astryxdesign/core) · [WCAG, uso del color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) |
| Cuestionario de salida | Repositorio: `evaluacionesService`, `resumenEvaluacion`, `leccionesCompletadas` y contratos de HU-19. Las alternativas de estados y permisos XState/CASL se contrastaron con este flujo. | **Extender** el cálculo vigente con la secuencia cuando el curso sea medido. Mantener la política, preguntas, calificación e intentos de HU-19 bajo el código mantenido en el repositorio, sin otra dependencia. |
| Verificación | Repositorio: `node:test`, Vitest, pruebas de evaluaciones y configuración Playwright real. npm/GitHub: `@playwright/test` 1.65.1 (Apache-2.0, 13 nov 2026, dependencia directa `playwright`). Skills locales para especificación, búsqueda, Astryx, planificación y revisión posterior. | **Adoptar** los comandos y herramientas instaladas. Los escenarios de prueba de HU-55 serán locales. No se propone actualizar paquetes. [Playwright](https://github.com/microsoft/playwright) |

Se consultó `frontend/src`, `backend/src`, los contratos de HU-17/HU-19/HU-37,
los metadatos con `npm view` y los repositorios públicos enlazados. Astryx
respondió con CLI y Core 0.7.16 a las dos búsquedas sobre secuencia, estados y
accesibilidad, y a `astryx component List`, `astryx component Badge`,
`astryx component Banner` y `astryx template course-detail --type page --skeleton`.
Se comprobó el inventario de herramientas y skills instaladas. Los canales MCP
de GitHub, Context7, PostgreSQL y Chrome DevTools y la CLI `gh` no estaban
disponibles. GitHub público, npm, documentación oficial y Astryx sí se
consultaron. No se necesita instalar paquetes.

Versiones fijadas en el proyecto y reutilizadas: `pg` 8.23.0 (cinco
dependencias directas), React Query 5.104.1, Lucide 1.52.0 (React como par y sin
dependencias directas), Vitest 5.0.3 (MIT) y Playwright 1.63.0.

## Implementación y verificación

- Pila y estructura: TypeScript, Fastify, PostgreSQL, React y TanStack Query.
  Extender `backend/src/{entities,repositories,services,controllers,dto}/avance`
  y sus puntos de integración en cursos y evaluaciones. Reutilizar
  `frontend/src/paginas/cursos/{avance,evaluaciones}`, los servicios y las rutas.
  Aplicar `camelCase` a funciones como `obtenerBloqueo` y `PascalCase` a tipos
  y componentes. Seguir las capas documentadas del repositorio.
- Ejecutar `npm run typecheck`, `npm test` y `NODE_ENV=test npm run test:integracion`
  con una base local de pruebas. Ejecutar el escenario real local con
  `npm run e2e:real -- hu55.local.spec.ts`. Cubrir el límite del 90 %, acceso,
  estados históricos, pruebas de integración y recorrido del aula real.
- La entrega conserva el esquema, versiones de paquetes y configuración de CI.
  Los archivos de prueba nuevos quedan locales. El usuario ejecuta el build
  y las operaciones Git manualmente. Los pasos y sus evidencias quedarán en
  [plan.md](plan.md) y [todo.md](todo.md).
