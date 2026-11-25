# HU-39 · Asistencia presencial con QR personal o DNI

**Estado** Implementada y verificada localmente. Base de la rama `d071380`.
**Referencia:** SCRUM-150 según la rama local. Sprint Asistencia presencial,
identificación provisional y número por confirmar.

## Objetivo

Un colegiado muestra su QR personal en el teléfono o en papel. El encargado
asignado a una sesión presencial escanea el código o busca el DNI y registra
la asistencia en la lista existente. El administrador puede delegar la puerta
y habilitar el QR rotatorio como alternativa para que el colegiado se registre.

## Capacidades

| Capacidad | Resultado | Base |
| --- | --- | --- |
| Credencial personal | «Mi QR» y PDF imprimible con el mismo código privado | Sesión del titular, datos de usuario y proveedor de PDF |
| Puerta y registro | Lectura de QR o búsqueda por DNI con asistencia única | Credencial, asignación de la sesión e inscripción activa |
| Configuración de sesión | Encargado predeterminado, delegación y QR rotatorio opcional | Programación de clases, HU-07 y HU-08 |

## Diagnóstico previo a la implementación

| Área | Disponible | Brecha |
| --- | --- | --- |
| «Mi QR» | Pantalla, generación SVG y descarga. La simulación produce un token de demostración y un PDF de texto. [Pantalla](../../../../../frontend/src/paginas/participante/MiQrPagina.tsx) · [Simulación](../../../../../frontend/src/mocks/asistenciaPuerta.ts) | Faltan los endpoints reales, una firma verificable y un PDF con imagen QR escaneable. |
| Puerta y DNI | La pantalla ya ofrece cámara, búsqueda por prefijo, resultados, contador y «Deshacer». Usa `useClase` y `useAsistencia`. [Puerta](../../../../../frontend/src/paginas/asistenciaPuerta/PuertaPagina.tsx) · [Servicio React](../../../../../frontend/src/servicios/asistenciaPuerta.ts) | Las rutas de puerta solo funcionan en la simulación. El DNI consultado por GET quedaría en la URL que registra Fastify. La caché muestra resultados anteriores mientras se consulta otro DNI. [Registro HTTP](../../../../../backend/src/plugins/registroCompacto.ts) |
| Inscripción y asistencia | `estaInscrito` comprueba matrícula de sesión y `tieneAccesoCurso` para cursos. `attendances` tiene una restricción única por clase y usuario, guarda el actor y registra hora de Lima. [Repositorio](../../../../../backend/src/repositories/asistencia/asistenciaRepository.ts) · [Esquema](../../../../../backend/migraciones/0004_asistencias.sql) | Falta registrar el origen de la puerta y proyectarlo sin mezclarlo con marcas rotatorias ni virtuales. |
| Programación | El formulario ya ofrece encargado y QR rotatorio. El DTO y el repositorio reales solo guardan los campos básicos. [Formulario](../../../../../frontend/src/paginas/cursos/sesiones/ProgramarSesionPagina.tsx) · [DTO](../../../../../backend/src/dto/clases/claseDto.ts) · [Persistencia](../../../../../backend/src/repositories/cursos/sesionesCursoRepository.ts) | El encargado y la opción rotatoria deben persistirse al crear y editar. |
| Acceso a sesiones | Los guards y la lista del instructor se basan en el docente asignado. [Guard](../../../../../backend/src/plugins/accesoSesiones.ts) · [Repositorio de clases](../../../../../backend/src/repositories/clases/clasesRepository.ts) | Un encargado que sea otro instructor necesita descubrir su asignación y consultar el contexto de puerta. Ampliar el guard general daría acceso innecesario a la gestión. |
| QR de clase | HU-07/HU-08 emiten un token de 30 s y validan firma, vencimiento, modalidad y matrícula en el backend. [Firma](../../../../../backend/src/services/qr/qrToken.ts) · [Marcado](../../../../../backend/src/services/asistencia/asistenciaService.ts) | La emisión y el consumo deben respetar la opción guardada, incluidas las sesiones ya creadas y los clientes anteriores. [Contrato actual](../../../../API.md#hu-39--qr-personal-y-asistencia-en-la-puerta) |

## Reglas de funcionamiento

1. **Credencial personal.** «Mi QR» obtiene el código de la cuenta autenticada
   del agremiado activo. Se puede mostrar antes de inscribirse. El permiso
   de marcar se decide en la sesión. El código contiene un identificador
   aleatorio estable y una firma con propósito propio, independiente del
   formato y del secreto de autenticación. La misma cuenta obtiene el mismo
   código en pantalla y PDF mientras su credencial siga vigente. El QR no
   codifica DNI, nombre, correo ni número de cuenta. La credencial impresa
   se puede copiar, por lo que en puerta se confirma la identidad. Se
   conserva el campo de próxima sesión, resuelto con acceso y fecha/hora de
   Lima. Si falta DNI, se muestra como no registrado. El significado del
   indicador institucional «Habilitado» requiere un padrón vigente, una
   habilitación positiva y un vínculo verificado con la cuenta. [HMAC en Node](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptotimingsafeequala-b)
2. **Asignación.** En sesiones nuevas del formulario, el instructor es el
   encargado inicial. El administrador puede seleccionar otro instructor
   activo del catálogo existente. La asignación es por sesión y no cambia
   quién dicta la clase. En puerta puede actuar el encargado efectivo o un
   administrador. El delegado descubre la sesión y ve su contexto mínimo,
   los conteos y las últimas marcas de puerta, con permisos limitados a esa
   función. Al reasignarlo o desactivarlo, pierde ese acceso en la siguiente
   petición. Mantener los permisos de edición, proyección y lista general.
3. **Puerta.** El escaneo registra automáticamente y confirma nombre, DNI
   con los últimos cuatro dígitos y hora si el colegiado está habilitado
   para registrar asistencia en esa sesión. Se valida modalidad presencial
   o `AMBAS`, estado de la sesión, curso abierto, identidad activa, matrícula
   y acceso vigente según las reglas de pago existentes. Un QR alterado,
   rotatorio o de otro sistema se rechaza. Para un no inscrito se muestra
   el motivo sin devolver sus datos de perfil. Al repetirse, se devuelve la
   hora de la marca anterior sin insertar otra fila. Las sesiones solo
   virtuales siguen el flujo de sala. [Inserción atómica en PostgreSQL](https://www.postgresql.org/docs/17/sql-insert.html#SQL-ON-CONFLICT)
4. **DNI.** La búsqueda exacta de ocho dígitos usa POST
   con cuerpo, sin modificar datos. Esto sustituye el prefijo de cuatro
   dígitos y el parámetro en URL descritos por la simulación. El servidor
   limita consultas por operador, busca únicamente entre inscritos con
   acceso a la sesión y devuelve nombre, identificador y DNI parcial.
   Seleccionar el resultado registra mediante la misma validación de puerta
   y conserva los ceros iniciales. Al cambiar el DNI se retira el resultado
   anterior. El flujo por DNI funciona si el navegador no tiene cámara o
   se deniega el permiso. [Captura de cámara](https://w3c.github.io/mediacapture-main/#dom-mediadevices-getusermedia) · [Contextos seguros](https://www.w3.org/TR/secure-contexts/)
5. **QR rotatorio.** La configuración del formulario permite habilitar
   también el QR de HU-07/HU-08. Si está desactivado, se bloquean tanto
   la emisión como el consumo, incluidos los tokens emitidos antes del
   cambio. El instructor y el administrador conservan los permisos
   anteriores de proyección cuando la opción está habilitada. Los
   registros de puerta y rotatorios comparten la misma restricción única.
   Las sesiones existentes conservan el rotatorio. Si un cliente anterior
   omite la opción al crear, conserva el comportamiento anterior. El
   formulario nuevo envía explícitamente puerta con rotatorio apagado.
   Una edición que omite la opción conserva lo guardado.
6. **Corrección.** Se conserva «Deshacer este registro» para rectificar una
   marca de puerta concreta. El servidor exige autorización, identidad de
   la operación y marca vigente y registra actor, sesión y hora de la
   corrección. Un reenvío atrasado no borra otra marca. Mantener las marcas
   virtuales, rotatorias y las de cursos cerrados fuera de esta operación.

La búsqueda usa POST y un límite de 30 consultas por operador y minuto.
La delegación usa el catálogo actual de instructores activos. La migración
0046 conserva el QR rotatorio habilitado en las sesiones históricas. La API de
clases puede omitir los nuevos campos cuando se aplica ese comportamiento
histórico.

## Criterios de aceptación

| ID | Resultado verificable |
| --- | --- |
| HU39-01 | El colegiado inscrito abre «Mi QR» autenticado, ve el código y descarga un PDF imprimible que se puede escanear. Pantalla y PDF representan la misma credencial. Otra cuenta recibe solo su propia credencial. |
| HU39-02 | El encargado efectivo o administrador escanea el QR de un inscrito con acceso en una sesión presencial o `AMBAS`. Ve nombre, DNI parcial y hora de Lima. La lista registra una presencia. |
| HU39-03 | Sin cámara o sin QR, la búsqueda por DNI encuentra al inscrito y permite marcar con método DNI. La búsqueda sola conserva el total. Ninguna respuesta, URL ni registro operativo contiene el DNI completo. |
| HU39-04 | Un no inscrito o sin acceso recibe un aviso sin datos de perfil. Un duplicado muestra la hora anterior. Dos solicitudes simultáneas, incluso por métodos distintos, generan una sola asistencia. |
| HU39-05 | Un código alterado, un QR rotatorio o de otro sistema se rechaza sin marcar. Una sesión virtual, cancelada o de curso cerrado conserva las restricciones vigentes. |
| HU39-06 | Al programar, el instructor queda encargado por defecto. El administrador guarda otro instructor activo y puede reasignarlo. El encargado puede abrir la puerta y los usuarios ajenos reciben 403. El delegado conserva únicamente los permisos de puerta. |
| HU39-07 | El administrador habilita o deshabilita el QR rotatorio. La emisión y el marcado respetan la opción guardada y su cambio, sin generar duplicados entre vías. Las sesiones históricas conservan HU-07/HU-08. |

## Contratos, código y límites

- Mantener Fastify, Zod y PostgreSQL en las capas actuales. Registrar las
  rutas con sus roles en la matriz. Usar una proyección de puerta sin correo
  ni DNI completo. Comprobar permiso por objeto antes de buscar o registrar
  y revalidar dentro de la transacción de escritura.
- Extender `GET /api/participante/mi-qr` y `GET /api/participante/mi-qr/pdf`
  con el contrato existente. Usar `GET /api/clases/:id/asistencia/puerta`
  para el contexto mínimo, `POST …/puerta/buscar-dni` para la consulta
  protegida y `POST …/puerta` para registrar con exactamente un selector
  válido. Mantener la ruta de deshacer y vincularla a una marca concreta.
  Las respuestas privadas usan `Cache-Control: private, no-store`. Evitar
  DNI y tokens en URLs, persistencia de cliente, registros y trazas.
- En una migración aditiva se mantienen los orígenes `QR` y `VIRTUAL` y se
  distinguen los nuevos orígenes de puerta, sujeto a la revisión de
  consumidores de `attendances`. Mantener el total y la asistencia que usan
  certificados. Escribir la configuración con la clase y preservar las
  filas anteriores. Usar módulos, rutas y componentes actuales de React
  y React Query. Claves privadas de consulta por cuenta y limpieza al salir.
- Tipos y componentes en PascalCase, funciones y variables en camelCase,
  archivos nuevos sin guiones bajos. Las credenciales usan secretos de
  servidor y formato versionado. Los cuerpos tienen límites y se validan
  con Zod. Las transacciones reutilizan el bloqueo de clase y unicidad
  existentes.
- El despliegue de la migración sigue el proceso manual del proyecto.
  El registro comparte los controles de acceso al curso y la tabla
  de asistencia que usan los cobros, la asistencia virtual y los certificados.

## Verificación prevista

| Alcance | Comando o entorno |
| --- | --- |
| Firma, enmascarado, preparación y política de rutas | `npm test -w backend` y `npm test -w frontend` |
| PostgreSQL y HTTP real, roles, carreras, trazas y regresiones | `NODE_ENV=test npm run test:integracion` en PostgreSQL y Redis aislados |
| Recorrido de puerta y alternativa rotatoria | `npm run e2e:real -- e2e/prb/real/asistencia.spec.ts e2e/prb/real/qr.spec.ts` y recorrido HU-39 local. Validar cámara y PDF con teléfono y HTTPS antes de habilitar el flujo. |
| Tipos y calidad | `npm run typecheck`, `npm run e2e:tipos`, `npm run lint -w frontend` |
| Build | `npm run build`, a cargo del usuario |

Las pruebas específicas de la historia quedan locales según la indicación
del usuario. Registrar evidencia roja y verde y preparar commits manuales.

## Soluciones existentes

Consulta del 25/11/2026. Se revisaron `frontend/src`, `backend/src`, la CLI
de Astryx, npm, repositorios públicos de GitHub, documentación primaria de
Node, PostgreSQL y W3C, el inventario MCP y las skills instaladas. GitHub CLI
y la búsqueda autenticada de código no estaban disponibles. El inventario
no ofrece MCP de cámara, PostgreSQL o Chrome DevTools. Figma y Atlassian
aparecen en el inventario. Esta revisión usa la trazabilidad de diseño y
Jira del repositorio, sin consultar espacios privados. Las pruebas de
navegador se planifican con Playwright local.

| Capacidad | Reutilización y candidatos | Decisión |
| --- | --- | --- |
| QR personal y firma | `qrToken.ts` ya usa HMAC-SHA256 y comparación en tiempo constante. `jose` 6.2.18, MIT, noviembre de 2026, cero dependencias directas, y `@fastify/jwt` 10.2.9, MIT, noviembre de 2026, cinco directas, ofrecen infraestructura JWT que no se necesita para el formato específico. [jose](https://github.com/panva/jose) · [Fastify JWT](https://github.com/fastify/fastify-jwt) | **Extender** el mecanismo existente con propósito propio e identificador opaco estable, usando `node:crypto`. |
| Pantalla y PDF imprimible | `MiQrPagina` usa `qrcode.react` 4.2.0, ISC, publicado en 2024, con React como par y actividad upstream en 2026. El proveedor de certificados usa `qrcode` 1.5.4, MIT, publicado en 2024, tres dependencias, y `pdf-lib` 1.17.1, MIT, publicado en 2021, cuatro dependencias y actividad upstream en 2024. `react-to-print` 3.3.0, MIT, febrero de 2026, React como par, cubre impresión web. [qrcode.react](https://github.com/zpao/qrcode.react) · [qrcode](https://github.com/soldair/node-qrcode) · [pdf-lib](https://github.com/Hopding/pdf-lib) · [react-to-print](https://github.com/MatthewHerbst/react-to-print) | **Componer** la pantalla y los generadores actuales. Usar la experiencia del PDF de certificados para insertar un QR legible y conservar la descarga autenticada. |
| Cámara y alternativa DNI | `LectorQr` ya usa `qr-scanner` 1.4.2, MIT, publicado en 2022, actividad upstream en 2024 y una dependencia de tipos. `@zxing/browser` 0.2.1, MIT, julio de 2026, requiere `@zxing/library`. `@yudiel/react-qr-scanner` 2.6.0, MIT, mayo de 2026, dos dependencias y pares React/DOM. [QR Scanner](https://github.com/nimiq/qr-scanner) · [ZXing](https://github.com/zxing-js/browser) · [React QR Scanner](https://github.com/yudielcurbelo/react-qr-scanner) | **Extender** el lector y los hooks existentes. Conservar la alternativa DNI y probar lectura por teléfono y papel antes de evaluar otra biblioteca. |
| Búsqueda por DNI y marcado único | La validación de identificadores ya usa Zod, MIT y mantenido, y el repositorio emplea `pg`, MIT y mantenido, con PostgreSQL 17. `estaInscrito`, `tieneAccesoCurso`, las transacciones de clase y `ON CONFLICT` cubren acceso, concurrencia y duplicado. El servicio de inscripción ya enmascara el DNI y deja visibles sus últimos cuatro dígitos. [Zod](https://github.com/colinhacks/zod) · [node-postgres](https://github.com/brianc/node-postgres) · [PostgreSQL](https://www.postgresql.org/docs/17/sql-insert.html#SQL-ON-CONFLICT) | **Componer** los recursos existentes para consulta exacta, enmascarado, registro y trazabilidad. Las reglas de matrícula y duplicado siguen centralizadas. |
| Interfaces y configuración | Astryx CLI/Core 0.7.16 ofreció `Card`, `TabList`, `Banner`, `TextInput`, `List`, `Selector` y `CheckboxInput`. Se revisó la plantilla `contact-form` como referencia de formulario de una acción. Core 0.7.17 en npm, MIT, noviembre de 2026, añade `intl-messageformat` y pares React/StyleX. Ya existen `Campo`, `Entrada`, `Selector`, `Boton`, `Aviso` y el formulario de sesiones. [Astryx Core](https://github.com/meta/astryx) | **Extender** las vistas actuales. Usar los patrones de tarjeta, selección, alertas y teclado de Astryx como referencia. |
| Alternativa rotatoria y pruebas | Los flujos HU-07/HU-08 ya verifican expiración, permisos y duplicados con `node:test`. Vitest (MIT) y Playwright (Apache-2.0) ya están instalados. Las skills de API, TDD y seguridad cubren contratos, pruebas y revisión. [Playwright y permisos de navegador](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions) | **Adoptar** los mecanismos y suites existentes. Extender únicamente la política de activación y verificar ambos métodos. |

Se propone usar las dependencias existentes. [Plan](plan.md) · [Seguimiento](todo.md).
