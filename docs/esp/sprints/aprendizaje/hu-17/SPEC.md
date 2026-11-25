# HU-17 · Completar contenido y ver avance

**Estado:** implementación aprobada y realizada. Build y publicación pendientes. Historia SCRUM-17, sprint Aprendizaje.

## Objetivo y caso de uso

El colegiado con acceso vigente abre un curso desde «Mis cursos» o su ficha,
consulta las unidades por módulo y puede retomar sus videos. El servidor
conserva el avance por inscripción, calcula cuánto queda y registra cuándo se
completa cada unidad. En cursos grabados, el reproductor controlado mide los
segundos efectivamente reproducidos en el aula y la salida de HU-19 consulta
la finalización registrada.

## Capacidades

| Capacidad | Resultado | Depende de |
| --- | --- | --- |
| Contenido y avance privado | Unidades obligatorias, acceso del titular, marca, fecha y proporción por unidad | Cursos, módulos, materiales e inscripción |
| Reproducción medida | Pausa al salir, retroceso y reanudación, avance acreditado y umbral del 90 % | Contenido, duración de referencia y progreso persistido |
| Resumen y continuidad académica | Barra por curso, estado por lección y consumo del avance en HU-19 | Avance privado y reproducción medida |

## Diagnóstico previo a HU-17

| Área | Evidencia | Diferencia con HU-17 |
| --- | --- | --- |
| Acceso a contenido | El detalle y los PDF aplican los permisos existentes. `tieneAccesoCurso` contempla inscripción vigente y pago previo. [Acceso](../../../../../backend/src/repositories/cursos/accesoCursoRepository.ts) · [Servicio de cursos](../../../../../backend/src/services/cursos/cursosService.ts) | Se puede reutilizar el criterio de acceso, pero el avance necesita además comprobar que el solicitante es el titular. |
| Unidades | Los módulos agrupan materiales `PDF`, `ENLACE` y `VIDEO`. El DTO de video comprueba HTTPS y ausencia de credenciales. [DTO](../../../../../backend/src/dto/cursos/cursoDto.ts) · [Repositorio](../../../../../backend/src/repositories/cursos/cursosRepository.ts) | Falta distinguir materiales obligatorios y guardar duración oficial y versión de los videos. Una página HTTPS externa puede no ofrecer reproducción controlable. |
| Aula grabada | Muestra solo videos asociados a la salida publicada, un contador por lecciones completadas y un botón manual. Reproduce archivos compatibles dentro de la página y también ofrece abrirlos en otra pestaña. [Aula](../../../../../frontend/src/paginas/cursos/evaluaciones/AulaEvaluacionesPagina.tsx) | El contenido debe estar disponible antes de publicar la evaluación. El reproductor actual no conserva posición ni evita avances y la pestaña externa no puede aportar mediciones al aula. |
| Avance y certificación | HU-19 registra `completadaEn` en `avanceLecciones` por evaluación e inscripción. Su repositorio consulta esas marcas para desbloquear y certificar. [Migración 0043](../../../../../backend/migraciones/0043-rendicionEvaluaciones.sql) · [Repositorio HU-19](../../../../../backend/src/repositories/evaluaciones/evaluacionesRepository.ts) | La finalización está ligada al cuestionario. HU-17 necesita un registro antes del cuestionario, sin dos criterios de finalización ni segundos inferidos de marcas históricas. |
| Patrones reutilizables | La demo aporta índice y barra de avance. La regla de asistencia virtual evita contar dos veces intervalos de conexión. «Historial» y «Mis cursos» ya muestran datos por cuenta. [Referencia T-24](../../../referenciaCursosGrabados.md) · [Asistencia virtual](../../../../../backend/src/services/reuniones/asistenciaVirtual.ts) | Reutilizar la presentación y los patrones de transacción. La asistencia y la demo tienen reglas distintas a las de reproducción acreditada. |

## Reglas de funcionamiento

1. **Unidades y entrada.** Cada material es una unidad del aula, ordenada por
   módulo. El instructor asignado declara cuáles son obligatorias. PDF y
   enlaces pueden marcarse como vistos tras consultarlos. En cursos grabados,
   solo se pueden declarar como videos obligatorios las fuentes compatibles
   con el reproductor medido. Los PDF y enlaces tienen su propia marca de
   consulta y no se suman al porcentaje de video. El colegiado entra desde «Mis cursos» o desde
   la ficha, aunque la evaluación todavía sea un borrador. El acceso lo
   resuelve el servidor con la inscripción y las reglas de cobro vigentes.
2. **Fuente de video y duración.** La primera versión admite archivos de video
   bajo HTTPS que se pueden reproducir y posicionar con el elemento de video
   del navegador. Como parte de configurar el video, el instructor confirma
   su duración finita a partir de la vista previa. El servidor conserva esa
   duración con la versión del material. La sesión del colegiado compara los
   metadatos de reproducción con la duración registrada. Una fuente que no
   carga, no admite reanudación o tiene duración incompatible presenta un
   aviso y queda fuera de la medición hasta corregirse. Los enlaces externos
   permanecen como recursos de consulta. GestionCapa no obtiene los archivos
   desde el backend.
3. **Marca y hora.** El servidor fija el instante de la primera finalización
   mediante `timestamptz` y lo presenta en `America/Lima`. El huso horario
   del navegador no altera la fecha ni la hora mostradas. Repetir la acción
   o enviarla simultáneamente conserva la marca y su fecha original.
4. **Reproducción y avance permitido.** El colegiado inicia o retoma el video
   de forma explícita. El aula pausa la reproducción al ocultar la pestaña o
   perder el foco de la ventana. También corta el registro cuando la página
   deja de estar activa, hay una pausa, espera de carga o búsqueda de
   posición. El usuario puede retroceder y volver hasta el tramo ya visto.
   Buscar más allá del límite deja el video en la posición permitida. La
   reproducción acreditada se mide a velocidad normal y se mantiene dentro
   del aula, con una sesión activa por inscripción.
5. **Reanudación.** Se guarda por separado la última posición confirmada y
   el punto hasta el que se acreditó reproducción continua desde el inicio.
   Retroceder puede reducir la posición de reanudación, pero conserva los
   segundos acreditados. Se sincroniza durante la reproducción, al pausar y
   al cambiar de lección. Al cerrar abruptamente, el punto recuperable es
   la última confirmación del servidor. Se propone un guardado periódico
   de hasta cinco segundos en conexión normal.
6. **Medición y porcentajes.** El servidor valida los reportes y acredita
   solo el tramo nuevo, consecutivo y reproducido dentro de la duración
   registrada. Los reintentos y los tramos repasados cuentan una sola vez.
   En un grabado, el porcentaje es la suma de segundos únicos acreditados
   de los videos obligatorios dividida entre la suma de sus duraciones.
   En otros cursos, es la proporción de unidades obligatorias completadas.
   La barra va de 0 a 100. Si todavía no hay unidades para el cálculo, muestra
   0 % con un estado explicativo. Un video se completa al alcanzar el 90 %
   exacto de su duración, antes de redondear para mostrar el porcentaje.
   Completar un video no le asigna segundos adicionales. El 90 % por video
   habilita la salida cuando todas sus lecciones requeridas están completas,
   aunque la barra del curso aún muestre menos de 100 %.
7. **Compatibilidad.** El modo medido de grabados se activa cuando el instructor
   ha configurado el contenido y el administrador valida su preparación.
   La activación fija el conjunto obligatorio y la versión de las fuentes
   para impedir que una edición reinterprete avances adquiridos. Una nueva
   salida medida requiere todos los videos obligatorios del curso. Las salidas
   ya publicadas conservan el conjunto exigido por HU-19. La migración
   conserva sus marcas históricas y fechas como finalizaciones académicas
   válidas, sin convertirlas en segundos de video. Los grabados existentes
   con fuentes sin configurar siguen en modo histórico hasta regularizarlas.
   En modo medido, el endpoint manual de HU-19 permite recuperar una
   finalización existente y rechaza crear una nueva para videos.
   Los resultados y documentos emitidos siguen siendo válidos.

## Criterios de aceptación

| ID | Resultado verificable |
| --- | --- |
| HU17-01 | El titular con inscripción vigente abre el aula aunque aún no haya evaluación publicada. Marcar un PDF o enlace obligatorio como visto registra la primera hora de Lima y recalcula la proporción correspondiente. Un reenvío concurrente conserva fecha y conteo, sin superar el 100 %. |
| HU17-02 | Un colegiado autenticado recibe 403 al pedir el avance de otra cuenta, incluso si ambos están inscritos en el mismo curso. Sin acceso vigente tampoco puede consultar ni escribir el propio. Sin sesión recibe 401. Los datos privados usan `no-store`. |
| HU17-03 | Tras reproducir, guardar y salir, al volver puede reanudar desde el último punto confirmado, incluso en otra sesión. Si retrocedió antes de salir, se retoma ese punto y se conserva lo visto. La pérdida del último guardado por cierre abrupto recupera la confirmación anterior. |
| HU17-04 | Cambiar de pestaña, minimizar o mover el foco a otra ventana pausa el video y durante ese intervalo permanece constante el tiempo acreditado. Volver requiere reanudar. Buffering, pausa y búsquedas no generan segundos vistos. |
| HU17-05 | Mouse, teclado u otro control del reproductor solo posicionan dentro del tramo acreditado o de la reproducción continua pendiente de guardar. Un salto más allá del tramo permitido no adelanta la posición efectiva ni suma avance. |
| HU17-06 | Dos videos de 100 y 300 segundos con 90 y 150 segundos acreditados muestran 60 % de avance. Repasar, repetir un reporte o abrir dos reproductores no duplica segundos. Una fuente sin duración compatible muestra un estado explicativo. |
| HU17-07 | En un video de 100 segundos, 89,999 s no completan y 90 s sí. La marca se registra una vez, con hora de Lima. En modo medido, llamar al endpoint manual no completa un video pendiente. El cuestionario y el cálculo para certificar usan la misma finalización y preservan las históricas. |
| HU17-08 | En un curso grabado, el aula muestra una barra con nombre accesible, porcentaje y estado por lección en móvil y escritorio. Se distinguen carga, falta de unidades, video pendiente de configurar y error de guardado. La nota y la asistencia tienen presentaciones propias. |

## Contratos, estructura y estilo

- Rol `AGREMIADO` en las rutas privadas de avance. La lectura propuesta
  `GET /api/cursos/:id/avance/:usuarioId` compara el titular de la ruta con
  la sesión antes de leer los datos. Las mutaciones obtienen el titular de
  la sesión. Validar curso, inscripción, material y versión en el servidor.
  Devolver porcentaje, unidades, segundos acreditados, posición, estado y
  marca de finalización, según corresponda. Un fallo de guardado deja visible
  el estado confirmado y permite reintentar.
- PostgreSQL es la fuente del estado. Registrar progreso por inscripción,
  material y versión. El primer tramo comienza en cero. Solo se amplía la
  reproducción continua si el nuevo tramo conecta con el ya confirmado, con
  cotas compatibles con el reloj del servidor y la última observación.
  Serializar los cambios de la misma inscripción y rechazar reportes de una
  sesión sustituida. Usar identidad de operación o secuencia para reintentos y
  mensajes fuera de orden. Compartir la consulta interna de finalización con
  HU-19 al evaluar la salida y al certificar.
- Implementación sobre Fastify, Zod y `pg` en las capas de
  `backend/src`, con migración aditiva en `backend/migraciones`. Interfaz
  en `frontend/src/paginas/cursos` con React, React Query y componentes
  locales. Mantener nombres de funciones y variables en camelCase y de
  componentes en PascalCase. Usar nombres del dominio como `posicionGuardada`
  y `segundosAcreditados`, con unidades explícitas para el cálculo.
- La telemetría permite verificar reproducciones en el reproductor admitido
  y acotar reportes con reglas del servidor. El navegador no acredita la
  atención humana. Evitar registrar URLs firmadas, claves de sesión o
  secuencias detalladas en logs operativos.

## Pruebas y comandos previstos

Las pruebas específicas de HU-17 y el script de datos de Playwright se
conservan en el entorno local de verificación. Los comandos dirigidos a esas
pruebas requieren ese entorno. Las suites existentes siguen disponibles en CI.

| Alcance | Comando desde la raíz |
| --- | --- |
| Reglas puras y arquitectura backend | `npm test -w backend` |
| PostgreSQL y HTTP, permisos, concurrencia y HU-19 | `NODE_ENV=test npm run test:integracion -w backend` con PostgreSQL, Redis y `DB_NAME` de pruebas aislados |
| Estado del reproductor y UI | `npm test -w frontend` |
| Navegador con video local, retoma y barra | `npm run e2e:real -- e2e/prb/real/avance.spec.ts`, con `gestioncapa_e2e` aislada |
| Cambio real de pestaña y foco | `hu17FocoNativo=1 npm run e2e:real -- e2e/prb/real/avance.spec.ts --headed --workers=1` en Linux con sesión X11 o Xwayland y `xmessage` disponible. El recorrido local también permite simular los eventos de foco y visibilidad. |
| Tipos y lint | `npm run typecheck`, `npm run e2e:tipos` y `npm run lint -w frontend` |
| Build de entrega a cargo del usuario | `npm run build` |

## Límites y decisiones

- **Siempre:** verificar titular y acceso vigente, medir con la fuente de
  duración registrada, conservar la fecha de finalización y usar datos de
  prueba aislados.
- **Video medido:** usar archivos directos HTTPS MP4, WebM, OGV, OGG o M4V
  que el navegador pueda reproducir y posicionar. El instructor confirma la
  duración y el administrador activa el seguimiento de un grabado preparado.
  La lección se completa al 90 %. La barra alcanza el 100 % cuando se
  acreditó toda la duración de los videos obligatorios.
- **Fuera de alcance:** alojamiento o transcodificación, medición de videos
  abiertos en otros sitios, sincronización sin conexión y cambios a notas,
  intentos, asistencia o pago de certificados. El git de escritura y el
  build son manuales según AGENTS.md.

## Soluciones existentes

Consulta del 25/11/2026. Se revisaron el código de `frontend/src` y
`backend/src`, el registro público de npm, GitHub público y su API, el
inventario de MCP y las skills instaladas. GitHub CLI no estaba instalado y se
usaron fuentes públicas. El inventario no incluye un MCP de Chrome DevTools,
video educativo o PostgreSQL. Playwright y el PostgreSQL de pruebas del
repositorio cubren la verificación prevista.

| Capacidad | Evidencia y alternativas | Decisión |
| --- | --- | --- |
| Acceso, marca y hora de Lima | `tieneAccesoCurso`, mapa de permisos, `conTransaccion`, Zod y `pg`. Ambos paquetes son MIT, con actividad en 2026. Zod no agrega dependencias y `pg` ya trae sus utilidades de conexión. `Intl.DateTimeFormat` con `America/Lima` ya se usa en `frontend/src/lib/formato.ts`. Luxon 3.7.2 MIT, publicado en 2025, aporta un envoltorio sobre `Intl` sin dependencias directas. [Zod](https://github.com/colinhacks/zod) · [node-postgres](https://github.com/brianc/node-postgres) · [PostgreSQL y fechas](https://www.postgresql.org/docs/17/datatype-datetime.html) | **Componer** acceso y transacción locales con `timestamptz` y el formateo de fecha existente. |
| Reproductor, pausa, reanudación y avance permitido | El aula usa `<video>`. HTML ofrece `currentTime`, `played`, `seeking`, duración y eventos de reproducción. La visibilidad y el foco son señales distintas. ReactPlayer 3.4.0 es MIT, con actividad upstream en octubre de 2026 y diez adaptadores directos. Media Chrome 4.19.5 es MIT, publicado en noviembre de 2026, y agrega `ce-la-react`. Video.js 10.7.0 es Apache-2.0, publicado en noviembre de 2026, y distribuye integraciones de HTML y React. Los paquetes aportan controles o proveedores, y aún habría que implementar las reglas HU-17. [HTML Media](https://html.spec.whatwg.org/multipage/media.html) · [Visibilidad y foco](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) · [ReactPlayer](https://github.com/cookpete/react-player) · [Media Chrome](https://github.com/muxinc/media-chrome) · [Video.js](https://github.com/videojs/video.js) | **Extender** el reproductor HTML con controles accesibles, eventos nativos y guardado conectado a la sesión existente. |
| Duración y versión de la fuente | El formulario actual ya captura y valida la URL HTTPS. La vista previa aporta duración de metadatos, y el instructor la revisa antes de persistirla. `music-metadata` 12.8.4 es MIT, publicado en noviembre de 2026, con ocho dependencias directas y foco en audio. MediaBunny (MPL-2.0) y MP4Box (BSD-3-Clause) quedan fuera de las licencias pedidas. [Music Metadata](https://github.com/Borewit/music-metadata) · [MediaBunny](https://github.com/Vanilagy/mediabunny) · [MP4Box](https://github.com/gpac/mp4box.js) | **Componer** el formulario de material, metadatos del navegador y duración persistida por versión. El servidor fija el valor confirmado por el instructor. |
| Segundos únicos, concurrencia y 90 % | Asistencia virtual une intervalos como referencia conceptual. PostgreSQL 17 tiene rangos, multirangos y `range_agg` incluidos. `ranges-merge` 9.2.6 es MIT, publicado en septiembre de 2026, y agrega `ranges-sort` y `codsen-utils`. Un motor de unión completa aporta poco mientras HU-17 solo acredita un tramo continuo desde cero. [Rangos de PostgreSQL](https://www.postgresql.org/docs/17/rangetypes.html) · [Ranges Merge](https://www.npmjs.com/package/ranges-merge/v/9.2.6) | **Construir** la regla del tramo continuo y umbral sobre PostgreSQL y transacciones existentes. La posición para reanudar se guarda por separado. |
| Barra, estado e índice de lecciones | El aula ya usa `progress`, `Etiqueta`, `Aviso` y React Query (MIT, actividad en noviembre de 2026, usa `@tanstack/query-core`). Astryx CLI/Core 0.7.16 mostró `ProgressBar`, `Slider`, `Banner` y la plantilla `course-detail`. Core es MIT, requiere `intl-messageformat` y pares React y StyleX. Radix Progress 1.2.1 MIT, con actividad en octubre de 2026, agrega contexto y primitivas. [Astryx Core](https://github.com/meta/astryx) · [Radix Progress](https://www.radix-ui.com/primitives/docs/components/progress) · [Elemento progress](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element) | **Extender** el aula y componer los controles locales. Tomar las referencias Astryx para barra, teclado y avisos. |
| Desbloqueo y certificación | HU-19 ya consulta las marcas para el cuestionario y la certificación. El repositorio mantiene su política de cobro y la salida versionada. Un LMS duplicaría identidad, inscripciones y estados que ya existen. [Contrato HU-19](../hu-19/SPEC.md) | **Extender** HU-19 para consumir la misma finalización interna que usa el aula, con lectura de datos históricos. |
| Verificación | `node:test`, Vitest (MIT) y Playwright (Apache-2.0) ya están en el proyecto. Las skills de API, frontend, TDD y seguridad y las referencias locales Definition of Done y Security Checklist están disponibles. Playwright documenta que cada página de un contexto se comporta como activa. [Playwright y múltiples páginas](https://playwright.dev/docs/pages#multiple-pages) | **Adoptar** las pruebas existentes y verificar foco real en modo visible. |

El plan usa capacidades nativas y dependencias ya declaradas. Los resultados
se convierten en tareas en el [plan](plan.md) y el [seguimiento](todo.md).
