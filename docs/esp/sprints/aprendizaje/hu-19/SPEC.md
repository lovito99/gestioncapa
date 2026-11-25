# HU-19 · Crear y rendir evaluaciones

**Estado:** implementada y verificada en pruebas locales. Build manual pendiente. Fuente funcional: historia y criterios entregados
para SCRUM-25. El alcance de lecciones y certificados se limita a lo que exige esta
historia y se vincula con HU-37 y HU-20.

## Objetivo

El instructor asignado prepara y publica evaluaciones de opción múltiple. El
administrador configura la nota mínima y el límite de intentos por curso. El
colegiado inscrito rinde la evaluación y consulta su resultado. En un curso
grabado, completa primero todas las lecciones obligatorias. Cuando el
administrador evalúa su inscripción y se cumplen las condiciones académicas y de
entrega, el colegiado obtiene un certificado de aprobación con su mejor nota.

## Mapa de capacidades

| Capacidad | Responsabilidad | Depende de |
| --- | --- | --- |
| `autoria-evaluaciones` | Borrador, configuración por curso, clave privada y publicación | Cursos, instructor asignado y permisos |
| `avance-lecciones` | Lecciones obligatorias del curso grabado y avance por inscripción | Módulos, materiales `VIDEO` y acceso vigente |
| `intentos-calificados` | Acceso, entrega, calificación, límite y mejor nota | Autoría y avance para la evaluación de salida grabada |
| `certificado-aprobacion` | Evaluar elegibilidad, emitir o retener, presentar el documento y verificar su vigencia | Intentos y avance o asistencia, con la entrega de HU-20/HU-53 |

Autoría y avance son independientes hasta el desbloqueo. La emisión consume el
resultado oficial del curso. El generador de PDF de HU-20 puede corregirse y
probarse antes de conectar la nueva emisión.

## Punto de partida e inconsistencias

| Área | Evidencia en el código | Consecuencia |
| --- | --- | --- |
| Configuración | `cursos.nota_minima`, `esquemaCurso` y el formulario de cursos ya usan 14 y permiten valores de 0 a 20. El formulario muestra la nota al crear y editar. Su edición llama a `PUT /cursos/:id`, que el backend actual no registra. El tipo `APROBACION` existe. [Migración](../../../../../backend/migraciones/0006-cursosConModulos.sql) · [DTO](../../../../../backend/src/dto/cursos/cursoDto.ts) · [Formulario](../../../../../frontend/src/paginas/cursos/CursoFormPagina.tsx) | Reutilizar la nota mínima del curso y añadir un contrato administrativo para editarla junto al máximo de intentos. |
| Autoría y calificación | El docente asignado puede agregar materiales. En el aula demo las opciones correctas están en un mock que responde por actividad, conserva avance por cuenta en el navegador y permite reintentar. Las rutas del aula solo se registran para el curso demo en el frontend. [Permisos](../../../../../backend/src/plugins/permisos.ts) · [Mock](../../../../../frontend/src/mocks/aulaGrabada.ts) · [Rutas](../../../../../frontend/src/rutas.tsx) | Falta un contrato real de publicación, persistencia de intentos y proyección de preguntas sin clave. Reutilizar la interacción del prototipo. |
| Lecciones | `VIDEO` es un material válido con URL HTTPS y pertenencia al módulo. `GRABADO` ya existe y no usa sesiones con fecha. El backend carece de un registro de finalización de lecciones. [DTO](../../../../../backend/src/dto/cursos/cursoDto.ts) · [Servicio](../../../../../backend/src/services/cursos/cursosService.ts) · [Aula](../../../../../frontend/src/paginas/cursos/AulaGrabadaPagina.tsx) | Proponer una lista obligatoria sobre los videos existentes y persistir el avance asociado a la inscripción. |
| Certificados | HU-20 emite participaciones con 80 % de asistencia y excluye `GRABADO` y `APROBACION`. El historial ofrece descarga y vista privada. Falta una entrada de colegiado llamada «Mis certificados». [Servicio](../../../../../backend/src/services/certificados/certificadosService.ts) · [Historial](../../../../../frontend/src/paginas/historial/HistorialPagina.tsx) · [Reglas HU-20](../../../../../docs/esp/certificados.md) | Ampliar la elegibilidad y ofrecer «Mis certificados» sobre el historial y la descarga existentes. |
| PDF y QR | El documento persistido ya guarda la modalidad, pero el proveedor PDF imprime «Presencial» y el título de participación. La verificación pública proyecta un conjunto reducido de campos. [Proveedor PDF](../../../../../backend/src/providers/certificados/constanciaPdf.ts) · [Contrato](../../../../../backend/src/entities/certificados/certificado.ts) | Renderizar modalidad y tipo desde los datos persistidos, incorporar nota en aprobación y mantener el contrato público del QR. |

## Comportamiento

1. **Autoría.** El instructor activo asignado crea y edita borradores con título,
   preguntas, dos o más opciones por pregunta y una única opción correcta. La
   publicación exige al menos una pregunta válida. Se pueden publicar varias
   evaluaciones por curso y designar una sola como resultado oficial para
   certificación. En `GRABADO` esa evaluación es el cuestionario de salida
   obligatorio. Solo la versión publicada se entrega al colegiado.
2. **Política académica.** El administrador configura por curso la nota mínima
   existente (14/20 en un curso nuevo) y los intentos máximos (2 por evaluación
   por defecto). La nota mínima está entre 0 y 20 y los intentos son un entero
   positivo. Cada publicación fija preguntas, clave y política. Un ajuste del
   administrador se aplica a publicaciones futuras. El curso histórico conserva
   su nota mínima configurada. La reapertura, sustitución de una evaluación
   oficial con intentos y concesión manual de intentos corresponden a otro
   alcance.
3. **Avance grabado.** El instructor selecciona al menos un material `VIDEO` del
   propio curso como lección obligatoria al preparar la salida. La lista se fija
   al publicar. El colegiado confirma «Completar lección» al terminar de
   revisarla y el servidor registra la finalización una vez por inscripción y
   lección. Refrescar o abrir otra sesión recupera el avance. El desbloqueo exige
   todas las lecciones obligatorias y lo comprueba el backend. El mecanismo
   propuesto registra una confirmación explícita y conserva el reproductor y la
   gestión de videos existentes.
4. **Rendición.** El servidor identifica al titular a partir de su sesión y
   exige acceso vigente, curso habilitado, evaluación publicada y, para la
   salida grabada, avance completo. El envío incluye una opción válida por
   pregunta. Una entrega válida consume un intento. Un formulario incompleto,
   manipulado o rechazado no lo consume. Las preguntas pesan lo mismo. La nota
   es `20 × aciertos ÷ preguntas`, redondeada a dos decimales (mitad hacia
   arriba). El servidor compara ese valor con la nota mínima. El colegiado ve
   la nota del intento, si aprobó, la mejor nota obtenida en esa evaluación y
   cuántos intentos usó y le quedan. Un empate conserva el primer
   intento con esa nota como referencia. Se permite mejorar con intentos
   disponibles hasta que se confirme el resultado de certificación.
5. **Evaluación del curso.** Para un curso grabado configurado como
   `APROBACION`, el administrador evalúa por inscripción desde la gestión del
   curso. Si la salida está aprobada y el avance está completo, se fija la mejor
   nota, se finaliza el resultado de esa inscripción y se emite o retiene el
   certificado de acuerdo con HU-53. Si aún no cumple, la evaluación
   administrativa informa el motivo y se puede volver a consultar después. Para
   cursos de aprobación con sesiones, se extiende el cierre existente con la
   nota aprobatoria, además del 80 % de asistencia, el fin de sesiones y el plazo
   vigente. Las excepciones de participación conservan su alcance. Una
   excepción no crea una nota ni sustituye los requisitos académicos de un
   certificado de aprobación.
6. **Entrega.** «Mis certificados» enlaza desde la navegación del colegiado y
   reutiliza los datos del historial y sus rutas de documento/descarga. El
   certificado de aprobación privado muestra mejor nota, tipo y modalidad real.
   El QR usa la verificación pública actual con vigencia y reemplazo. El pago
   previo, el pago al certificado, las retenciones y las condiciones históricas
   conservan las reglas de acceso y emisión actuales. Los documentos emitidos
   conservan sus bytes y sus datos de emisión. Una corrección autorizada genera
   un reemplazo por el flujo vigente.

## Criterios de aceptación

| ID | Resultado verificable |
| --- | --- |
| HU19-01 | El instructor activo asignado puede guardar un borrador y publicar una evaluación válida. Otro instructor, un agremiado y un usuario sin sesión no pueden editarla ni publicarla. El borrador no es visible para rendición. Una segunda salida certificable del mismo curso se rechaza. |
| HU19-02 | Un curso nuevo, o uno existente sin configuración de intentos, ofrece 2 intentos. La nota mínima predeterminada de un curso nuevo es 14/20. Se respeta el valor de cursos existentes. Solo el administrador puede cambiar los dos valores, y una evaluación ya publicada conserva los suyos. |
| HU19-03 | Una entrega válida de un titular habilitado se califica en el servidor y devuelve nota, aprobación, mejor nota y saldo de intentos. La lectura y la respuesta del colegiado omiten claves, marcas de corrección por opción y resultados ajenos. Las opciones duplicadas, ajenas o faltantes se rechazan sin consumir intento. |
| HU19-04 | Tras el límite, la API responde `409` con el estado final del titular, incluida la mejor nota y cero intentos restantes. Dos solicitudes concurrentes ante el último cupo producen un solo intento nuevo. Reenviar la misma operación y respuestas recupera su resultado. Reutilizarla con otras respuestas se rechaza. |
| HU19-05 | En grabado, completar una misma lección dos veces no duplica avance. Cero lecciones, lecciones de otro curso y avance incompleto mantienen bloqueada la salida. Al completar todas se habilita y el avance se conserva al recargar. Un pago previo pendiente o una inscripción cancelada bloquea las operaciones. |
| HU19-06 | Con dos notas, en ambos órdenes, la mayor prevalece para el resultado del colegiado y para la certificación. Se comprueban la nota exacta de aprobación, un valor inferior y el empate. |
| HU19-07 | Si el curso grabado tiene avance completo y nota aprobatoria, su evaluación administrativa produce un solo certificado o una sola entrega retenida, incluso con reintentos de la solicitud. Si falta un requisito, no emite. El caso de curso con sesiones requiere también asistencia y cierre conforme a HU-20. |
| HU19-08 | El colegiado encuentra el documento vigente en «Mis certificados» y puede ver y descargar su nota. El QR verifica código y vigencia sin revelar nota ni DNI. Se mantienen anulación y reemplazo. Un tercero no puede descargar el PDF. |
| HU19-09 | El PDF generado muestra presencial, virtual, híbrida o grabada según la modalidad registrada al emitir o corregir. El título y la nota distinguen la aprobación de la participación. Se conserva la descarga existente de documentos históricos. |

## Contratos, estructura y estilo

- Separar proyecciones de autoría y rendición. La primera incluye la clave solo
  para el instructor asignado. La segunda contiene identificadores opacos,
  enunciados y opciones. El envío acepta identificador de operación y pares de
  pregunta/opción. Una proyección de resultado propia devuelve la nota del
  intento, aprobación, mejor nota y disponibilidad. Ante un conflicto de límite
  o cierre devuelve el estado actual del titular sin registrar una nueva entrega.
- PostgreSQL será la fuente de intentos, avance y resultado. En la misma
  transacción se verifican acceso, pertenencia y estado, se serializa por
  inscripción antes de contar intentos y se guarda el resultado. Usar
  restricciones de unicidad para operación y progreso, y un orden de bloqueo
  compatible con los flujos de curso y certificado. El cierre y una última
  entrega simultánea deben producir una sola decisión consistente.
- Backend con TypeScript, Fastify, PostgreSQL, `pg` y Zod. Aplicar las capas
  vigentes `backend/src/{routes,controllers,dto,entities,services,repositories}`.
  Conservar el PDF en `providers` y usar migraciones aditivas en
  `backend/migraciones`. Incorporar rutas en el mapa de permisos y contratos
  HTTP antes de conectar la interfaz. React, React Query y React Hook Form en
  `frontend/src/{paginas,components,servicios}`, con los componentes y estilos
  del repositorio.
- Seguir convenciones de AGENTS.md. El ejemplo actual
  `transaccion(cliente => trabajo(cliente))` representa el límite de I/O. La
  regla pura de calificación recibe las respuestas ya validadas y se prueba sin
  Fastify. Los nombres de nuevas variables, funciones y archivos van sin
  guiones bajos. Los nombres SQL existentes, como `nota_minima`, mantienen
  compatibilidad y se proyectan como `notaMinima`.

## Estrategia de pruebas y comandos

| Verificación posterior a la aprobación | Comando desde la raíz del repositorio |
| --- | --- |
| Backend unitario y arquitectura con `node:test` | `npm test -w backend` |
| Integración HTTP, persistencia, concurrencia, permisos, HU-20 y HU-53 | `NODE_ENV=test npm run test:integracion -w backend`, con PostgreSQL y Redis aislados y `DB_NAME` de pruebas |
| Interfaz, accesibilidad de formularios y estados con Vitest | `npm test -w frontend` |
| Recorrido real autoría → rendición → descarga/QR con Playwright | `npm run e2e:real -- e2e/prb/real/evaluaciones.spec.ts`, con la base `gestioncapa_e2e` aislada |
| Tipos, estilo y desarrollo local | `npm run typecheck`, `npm run lint -w frontend` y, para inspección manual, `npm run dev` |
| Build de entrega a cargo del usuario | `npm run build` |

Las pruebas cubren cada criterio y los límites indicados. No se fija un umbral
global nuevo de cobertura. Ubicación de pruebas: `backend/test`,
`backend/test/integracion`, pruebas de componentes junto al código y
`e2e/prb/real`. Revisar el texto del PDF descargado y el destino de su QR.

## Límites y decisiones

- **Siempre:** comprobar rol y pertenencia en el servidor, mantener la clave
  fuera de proyecciones y logs del colegiado, usar pruebas aisladas y preservar
  la política de cobro, los PDF históricos y el contrato público.
- **Decisiones de implementación:** el colegiado confirma la finalización de
  cada lección. El administrador evalúa cada inscripción grabada y fija la
  mejor nota disponible al emitir o retener el certificado. El formulario de
  alta permite crear un curso grabado y conserva «Con sesiones» como opción
  inicial. Una dependencia nueva requerirá autorización separada.
- **Fuera de alcance:** intentos extraordinarios, bancos aleatorios, exámenes
  con múltiples respuestas correctas por pregunta, monitorización de reproducción,
  alojamiento de videos, cambios de datos de la demo, firma oficial y despliegue.
  Las operaciones de Git y el build corresponden al usuario según AGENTS.md.

## Soluciones existentes

Consulta del 24/11/2026. Se revisaron `frontend/src` y `backend/src` con `rg`.
En Astryx se usaron `astryx search`, `astryx component` y vistas de plantillas.
También se consultaron `npm search`, `npm view`, repositorios y API públicos de
GitHub, el inventario MCP y el catálogo local de skills. GitHub CLI no estaba instalado y no
se consultaron repositorios privados. El inventario MCP no ofrece LMS/evaluaciones,
PostgreSQL ni Chrome DevTools. La búsqueda web y Figma están disponibles. Se usa
la referencia local T-24 para la interfaz. Playwright ya cubre la verificación
real de navegador sin incorporar un servicio externo.

| Capacidad | Candidatos y evidencia | Decisión |
| --- | --- | --- |
| Autoría y configuración | `CursoFormPagina`, `Campo`, `Entrada`, `Boton`, permisos del instructor y Zod. React Hook Form ya está bloqueado en 7.89.0, MIT, activo en npm en noviembre de 2026 y sin dependencias de ejecución. Astryx 0.7.16 ofrece `FormLayout`, `TextInput`, `RadioList` y la plantilla `settings`. El Core es MIT, publicado el 14/11/2026, requiere `intl-messageformat` y pares React/React DOM y StyleX. [React Hook Form](https://github.com/react-hook-form/react-hook-form) · [Astryx Core](https://www.npmjs.com/package/@astryxdesign/core/v/0.7.16) | **Componer** controles existentes, React Hook Form y Zod. Usar la estructura de formulario de Astryx como referencia, sin sumar StyleX ni otro diseño al repositorio. |
| Interfaz de rendición y resultado | El aula demo ya usa `fieldset` y radio nativo, React Query y mensajes de estado. Astryx ofrece `RadioList`, `Banner` y `form-wizard`. `react-quiz-component` 2.1.1, MIT, publicado en noviembre de 2026, agrega `nanoid`, `snarkdown` y `sanitize-html`. Su formato de entrada entrega `correctAnswer` al cliente. Radix Radio Group, MIT y activo en 2026, incorpora dependencias Radix y se solapa con los controles disponibles. [React Quiz Component](https://github.com/wingkwong/react-quiz-component#quick-start) · [Radix Radio Group](https://www.radix-ui.com/primitives/docs/components/radio-group) | **Extender** el patrón del aula para múltiples preguntas y un resultado agregado, con los controles actuales. |
| Calificación, límites y concurrencia | El repositorio ya usa `conTransaccion`, `pg` 8.23.0 y Zod 4.6.7. Ambos paquetes son MIT y tenían actividad en octubre/noviembre de 2026. Zod no agrega dependencias y `pg` ya trae su pool y tipos. Learning Kit `@intellectif/lk-core` 1.15.0, MIT y publicado en noviembre de 2026, agrega Zod y su integración de UI exige React 19. Su cálculo genérico no resuelve acceso, límites transaccionales ni la certificación. [Learning Kit](https://github.com/intellectif/learning-kit) · [Bloqueos en PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html) | **Construir** la regla de negocio y su persistencia sobre las dependencias existentes. |
| Avance grabado y desbloqueo | Existen materiales `VIDEO`, el patrón de aula y el control de acceso a cursos. `react-player` 3.4.0, MIT, con actividad en octubre de 2026, incorpora adaptadores de reproducción. Sus eventos no resuelven la pertenencia de la lección ni el registro durable. Astryx `ProgressBar` es una referencia para texto y estado accesibles. [React Player](https://github.com/cookpete/react-player#callback-props) · [Prototipo T-24](../../../../../SPEC.md#t-24--referencias-de-diseño-para-cursos-grabados) | **Extender** materiales y aula con el registro persistente mínimo en PostgreSQL. |
| Certificado, PDF, historial y QR | HU-20/HU-53 ya resuelven transacción, retención, descarga y vigencia. `pdf-lib` 1.17.1 y `qrcode` 1.5.4 son MIT, están fijados en el lockfile y tienen actividad upstream menos reciente que jsPDF, con sus dependencias de PDF/fuentes/PNG ya instaladas. jsPDF 4.2.1, MIT y con actividad en 2026, agrega `@babel/runtime`, `fflate` y `fast-png`. Duplicaría el generador sin resolver emisión ni verificación. [pdf-lib](https://github.com/Hopding/pdf-lib) · [node-qrcode](https://github.com/soldair/node-qrcode) · [jsPDF](https://github.com/parallax/jsPDF) | **Extender** el servicio, proveedor y vistas existentes. Conservar el código QR y los archivos persistidos. |
| Pruebas, inspección y seguridad | `node:test`, Vitest y Playwright están en el proyecto (Vitest MIT, Playwright Apache-2.0). Están disponibles las skills de diseño de API e interfaz, TDD, implementación incremental, revisión y seguridad. Las referencias `definition-of-done.md` y `security-checklist.md` existen en `~/.agents/agent-skills/references/`. | **Adoptar** la infraestructura de pruebas y los criterios existentes. Utilizar las skills de ejecución tras la aprobación. |

Las decisiones no requieren instalar paquetes ni configurar servidores MCP.
Consultar [el plan](plan.md#hu-19--plan-de-implementación) y
[el seguimiento](todo.md#hu-19--seguimiento).
