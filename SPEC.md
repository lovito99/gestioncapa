# Especificación T-20: proteger main, CI y revisión en pares

Estado: propuesta pendiente de aprobación; no autoriza implementación.
Fecha de revisión: 14/11/2026, America/Lima. Base local: `031eb92`.
Plan: [tasks/plan.md](tasks/plan.md), sección T-20.
Seguimiento: [tasks/todo.md](tasks/todo.md), sección T-20.

## Objetivo y caso de uso

Como integrante del equipo, quiero integrar cambios a `main` exclusivamente por
pull request, con pruebas satisfactorias y aprobación de otro integrante, para
evitar cambios sin revisión y dejar evidencia verificable de la retrospectiva
del Sprint 1. T-20 reemplaza a SCRUM-103. Planning Poker queda pendiente del equipo.

El usuario confirmó que el destino es **lovito99/gestioncapa**, remoto `upstream`.
`origin` apunta al fork **251012-sharmely/gestioncapa**; proteger ese fork por sí
solo no cumple la tarea. El autor trabaja en su rama; el administrador configura
GitHub y otro integrante con escritura publica la aprobación.

Esta es una sola política de integración: protección, CI y revisión aportan sus
condiciones y evidencia. No se añaden módulos al producto ni se despliega software.

## Decisiones confirmadas y supuestos por validar

- Conservar íntegramente los planes CPPP/T-23 y añadir T-20 al final de los dos
  archivos de `tasks/`, según respuesta expresa del usuario. Sus tareas y los
  marcadores de conflicto existentes no se resuelven en T-20.
- Preparar especificación y plan juntos, por solicitud expresa del usuario,
  y detenerse antes de escribir código o modificar la configuración de GitHub.
- La rama actual y el PR previo #24 usan `SCRUM-118`; falta confirmar su
  correspondencia en Jira. `T-20` es el identificador de trabajo; no sustituye
  una clave real. No reutilizar SCRUM-103.
- Se propone mantener la regla clásica descrita en `docs/calidad.md`, para el
  patrón exacto `main`, sin crear además un ruleset equivalente.
- La aprobación del plan no cambia las reglas de Git y build manuales de
  [AGENTS.md](AGENTS.md). El agente preparará mensajes; el usuario hará commits,
  publicaciones de la rama, PR y merge. Un administrador activará la protección.

## Estado comprobado e inconsistencias

Consultas públicas de solo lectura realizadas el 14/11/2026; no son una promesa
del estado futuro ni una verificación de cambios todavía no implementados.

| Hallazgo | Evidencia e implicación |
|---|---|
| `main` central sin protección | [API de la rama](https://api.github.com/repos/lovito99/gestioncapa/branches/main): `protected: false`; [rulesets](https://api.github.com/repos/lovito99/gestioncapa/rulesets): lista vacía. Guardar YAML o documentación no activa la protección. |
| El antecedente `ced5c2a` existe | Commit local del 26/10/2026; [API de PR asociados](https://api.github.com/repos/lovito99/gestioncapa/commits/ced5c2a9477990b729d285c988532fe38a190c9c/pulls): lista vacía, compatible con el ingreso directo descrito. No se reescribe ese historial. |
| Ambos workflows ya atienden PR | `calidad.yml`: `opened`, `synchronize`, `reopened`, `edited`; `e2e.yml`: eventos predeterminados de PR. Sin filtros de rutas o ramas para PR. La clave Jira ya se comprueba por rama o título, también al editar el PR. |
| Último PR de T-20 integrado sin cierre completo | [PR #24](https://github.com/lovito99/gestioncapa/pull/24), integrado el 07/11/2026 en Lima: [Calidad satisfactoria](https://github.com/lovito99/gestioncapa/actions/runs/42440069236), [E2E fallida](https://github.com/lovito99/gestioncapa/actions/runs/42440069254). [Revisiones](https://api.github.com/repos/lovito99/gestioncapa/pulls/24/reviews): solo `COMMENTED` de Copilot, sin aprobación humana registrada. No acredita el cierre de T-20. |
| E2E sigue fallando en la base actual | SHA `031eb9239af79fbe87ce715f7a23ae11be00834b`: [Calidad success](https://github.com/lovito99/gestioncapa/actions/runs/42542528998); [E2E failure](https://github.com/lovito99/gestioncapa/actions/runs/42542528888). El [job](https://github.com/lovito99/gestioncapa/actions/runs/42542528888/job/128920426576) pasó instalación, tipos, build y demo; falló en **E2E real**. La causa raíz aún no está determinada. |
| El fallo observado no es `startup_failure` | La [check suite](https://api.github.com/repos/lovito99/gestioncapa/check-suites/115234286891) terminó `completed/failure`. La anotación solo informa salida 1; el aviso de Node 20 en upload-artifact no demuestra la causa, y la subida de artefactos pasó. |
| Documentación contradictoria | `docs/calidad.md` habla de dos jobs, pero Calidad tiene tres; `docs/esp/calidad.md` exige «Calidad» y la plantilla enumera cuatro checks concretos. `README.md` afirma que se conserva el lockfile, pero `git ls-files` no registra ninguno: el local está ignorado por `.gitignore`. `docs/e2e.md` recomienda `npm ci` para un clon que carece de lockfile versionado. |
| Seguimiento anterior incompleto | `tasks/todo.md` contiene pendientes CPPP y marcadores `Updated upstream` / `Stashed changes` ya presentes en HEAD. No son conflictos creados por esta tarea. |

## Alcance y límites

Incluye diagnosticar y corregir la causa demostrada de E2E real; conservar o
ajustar mínimamente los workflows; alinear la guía y plantilla de revisión;
configurar manualmente la protección y registrar evidencia del nuevo PR.
La causa puede ser infraestructura, datos, prueba o producto: no se decide antes
de reproducirla. Si exige una funcionalidad ajena, actualizar alcance y plan antes
de implementarla. No eliminar pruebas ni rebajar requisitos para obtener verde.

Siempre: conservar los cuatro checks, permisos mínimos, pruebas con datos
aislados, nombres nuevos sin guiones bajos y evidencia ligada al último cambio.
Pedir decisión ante ampliaciones de alcance, dependencias nuevas, cambios de
política de lockfile o sustitución de la regla clásica. Nunca: escribir secretos,
aprobar en nombre de otro integrante, usar bypass, hacer push a `main`, ejecutar
builds localmente como agente ni efectuar operaciones Git de escritura.

No incluye API de Jira, estimaciones inventadas, migraciones de negocio,
CODEOWNERS con personas supuestas, merge queue, despliegue o arreglo del plan CPPP.

## Criterios de aceptación

| ID | Dado / Cuando / Entonces y evidencia exigida |
|---|---|
| T20-01 | Dado `main` en el repositorio central, cuando un cambio pretende integrarse, requiere PR y al menos **1 aprobación de otro integrante con escritura**. La regla está guardada, se aplica a administradores, no admite bypass y prohíbe force push y borrado. Verificar configuración efectiva y captura; no probar haciendo push a `main`. |
| T20-02 | Dado un PR sin aprobación o con un check pendiente/fallido, GitHub bloquea su integración. Nuevos cambios revisables invalidan aprobaciones previas; las conversaciones deben estar resueltas y la rama actualizada respecto de `main`. Proponer exigir también aprobación del último push por otra persona. Verificar en la regla y el estado del PR. |
| T20-03 | Al abrir, actualizar commits o reabrir cualquier PR, incluso documental o desde un fork, se solicitan `calidad.yml` y `e2e.yml`, sin filtros por archivos ni omisión por borrador. Al editar título se revalida Jira. Los conflictos de merge y la autorización inicial de Actions para contribuyentes externos deben resolverse antes de evaluar resultados. |
| T20-04 | El PR de cierre tiene los checks **Clave Jira**, **Tipos, build y pruebas**, **Entorno con Docker Compose** y **E2E demo y real** ejecutados y con `success`, exigidos por protección y asociados a GitHub Actions. Ambos workflows terminan satisfactoriamente para el último estado del PR. `skipped`, `neutral`, cancelación y resultados antiguos no son evidencia de ejecución correcta. |
| T20-05 | Una clave Jira válida en rama **o** título permite pasar trazabilidad; ausencia en ambos hace fallar ese check y bloquea merge. Corregir o quitar la única clave del título, sin nuevos commits, actualiza el resultado. Se valida sintaxis existente, no la existencia de la incidencia en Jira. |
| T20-06 | Otro integrante publica **Approve / APPROVED** en GitHub para los cambios vigentes; se registra el enlace a esa revisión en el PR. Un comentario, bot, casilla o aprobación descartada no cumplen. La revisión explica qué se comprobó. |
| T20-07 | Existe evidencia de la regla guardada y efectiva para `main`, URL del PR revisado, URL de aprobación y enlaces a las dos ejecuciones satisfactorias. Se registran repositorio, PR, SHA de cabecera, SHA probado si es el merge de prueba y fecha. El PR #24 y ejecuciones históricas solo sirven de antecedentes. |
| T20-08 | La guía, especificación de calidad y plantilla usan los mismos cuatro checks y describen roles, Git/build manuales, diagnóstico y evidencias pendientes con exactitud. Planning Poker queda identificado como pendiente hasta que el equipo aporte el resultado. |

## Pila, estructura y estilo

Monorepo npm workspaces, Node 24, npm 11; backend TypeScript/Fastify con
`node:test`, frontend React/Vite con Vitest y pruebas Node del servidor;
Playwright para E2E demo y real; PostgreSQL 17 y Redis 8 para integración.
Se conservan las versiones y rangos de los manifiestos; no se actualizan aquí.

```text
.github/workflows/calidad.yml  → trazabilidad, tipos/build/unitarias y entorno
.github/workflows/e2e.yml      → Playwright demo y real
.github/pull_request_template.md → contrato externo existente; conservar nombre
backend/test/                 → pruebas unitarias; integracion/ usa servicios
frontend/src/                 → interfaz y pruebas Vitest existentes
e2e/prb/real/                 → reproducción E2E que debe identificarse
e2e/ayud/                     → preparación y ayudas de los recorridos
docs/calidad.md, docs/esp/calidad.md, docs/e2e.md, README.md → guías existentes
SPEC.md, tasks/plan.md, tasks/todo.md → propuesta y seguimiento T-20
```

Ejemplo real de `.github/workflows/calidad.yml`; los nombres externos de entorno
se conservan y se convierten a alias camelCase antes de usarlos:

```js
const { PR_TITLE: prTitle, PR_BRANCH: prBranch } = process.env;
const jiraKey = /\b[A-Z][A-Z0-9]*-[1-9][0-9]*\b/;
```

Funciones y variables nuevas usan camelCase; tipos y componentes PascalCase;
archivos nuevos siguen su carpeta sin `_`. Mantener el formato del archivo tocado.
Conservar los nombres visibles de los checks para no romper la protección.

## Comandos y estrategia de verificación posterior a aprobación

Todos se ejecutan desde la raíz. No se ejecutan pruebas funcionales en esta fase.

| Responsable / comprobación | Comando completo | Condición |
|---|---|---|
| Agente: tipos | `npm run typecheck` | No invoca el script build; configuraciones revisadas con `noEmit`. |
| Agente: unitarias | `npm test` | `node:test`, Vitest y pruebas del servidor frontend. |
| Agente: lint disponible | `npm run lint -w frontend` | Registrar avisos preexistentes; no añadir supresiones. |
| Agente: tipos E2E | `npm run e2e:tipos` | Sin build. |
| Agente: integración | `npm run test:integracion` | Solo entorno temporal aislado; no usar una BD existente por defecto. |
| Agente: cobertura vigente | `npm run test:cobertura` | Entorno aislado; mínimo **60 %** en líneas, ramas y funciones de asistencia. |
| Agente: demo / real | `npm run e2e` / `npm run e2e:real` | El real usa exclusivamente `gestioncapa_e2e`; revisar aislamiento y puertos antes. |
| Agente: prueba enfocada | `npm run e2e:real -- --grep 'ID-del-criterio-identificado'` | Sustituir el ID tras el diagnóstico; no es un comando listo para ejecutar aún. |
| Agente: integridad documental | `git diff --check -- SPEC.md tasks/plan.md tasks/todo.md` | Al validar cambios nuevos, distinguir marcadores antiguos de errores introducidos. |
| Usuario: build local | `npm run build` | Manual; evidencia de CI anterior no acredita el build de esta entrega. |
| Usuario: desarrollo, si necesita reproducir | `npm run dev` | Servicios locales disponibles. |

Primero registrar el fallo y su causa, después escribir o precisar la prueba
de regresión que falla por el defecto, implementar lo mínimo y comprobar verde.
No presentar una prueba ya verde como TDD retroactivo. Para configuración y
documentación, usar validación declarativa y verificaciones negativas del PR;
no crear pruebas que solo reproduzcan líneas YAML ni simular un rojo artificial.
Si cambia la lógica de trazabilidad, cubrir entradas válidas, vacías, incorrectas
y contenido no confiable antes de cambiarla. Repetir suites solo tras cambios
que puedan afectarlas. La aceptación final requiere ejecución real en GitHub.

La protección se verificará por sus ajustes efectivos y por el bloqueo de merge
en casos negativos, sin intentar un push directo. La cuenta administradora no
se sustituye por credenciales o permisos supuestos del agente.

## Calidad, seguridad y preparación de entrega

Usar como puerta de salida las referencias solicitadas:
`~/.agents/agent-skills/references/definition-of-done.md` y
`~/.agents/agent-skills/references/security-checklist.md`, leídas en esta fase.
Registrar cada control aplicable como aprobado, fallido o pendiente; justificar
los que no apliquen. Leer sus skills asociadas al ejecutar la fase de revisión.

- Corrección: aceptación, pruebas de regresión y runtime de CI/protección reales.
- Calidad: limpieza acotada, tipos y lint; sin pruebas omitidas ni cobertura reducida.
- Integración/documentación: nombres estables, funcionamiento desde fork, guías
  coherentes y evidencia separada de antecedentes. No se prevén migraciones.
- Seguridad: título y rama son entradas no confiables; pasarlos por entorno,
  sin interpolarlos en shell. Conservar `contents: read`, evitar
  `pull_request_target` con código del PR y secretos de producción. No mostrar
  secretos al adjuntar logs o capturas. Datos de CI aislados y sin privilegios reales.
- Dependencias: npm es el gestor del workspace; no hay lockfile versionado.
  La lista de seguridad exige revisar reproducibilidad, scripts de instalación
  y auditoría; no constan todavía aprobadas. Mantener la convención actual es
  una limitación explícita, no un control satisfecho. Cualquier cambio de política
  se someterá a decisión antes de implementarse; no ejecutar instalaciones para
  descubrir scripts desconocidos ni remedios forzados de auditoría.
- Publicación: el usuario decide Git y merge; administrador y revisor aportan sus
  evidencias. Revertir cambios futuros mediante otro PR con revisión y checks;
  corregir la configuración sin desactivar la exigencia de PR/aprobación.

## Pendientes y puerta de aprobación

Confirmar clave Jira real, administrador disponible y revisor distinto del autor.
El diagnóstico debe identificar la prueba y archivo responsables del fallo E2E;
si amplía alcance, actualizar estos documentos antes de corregir. Acordar el
tratamiento del riesgo de dependencias antes del cierre de seguridad. Registrar
Planning Poker cuando el equipo lo realice.

Esta entrega solo guarda la propuesta. Implementación, build local manual,
configuración de GitHub, PR nuevo y revisión humana siguen pendientes. No existen
commits nuevos ni etiquetas creadas por el agente.

## Referencias oficiales consultadas

- [Protección de ramas, aprobaciones y checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- [Eventos de PR, merge de prueba y contribuciones desde forks](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).
- [Estados de checks y significado de startup_failure](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/reference/status-checks).
- [setup-node sin lockfile](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#running-without-a-lockfile).

---

# HU-53: Modalidad de cobro por curso

## Estado, objetivo y decisiones confirmadas

Implementación autorizada expresamente por el usuario después de la planificación
y continuada el 15/11/2026. Los cuatro bloques tienen código y pruebas locales.
Las pasarelas permanecen deshabilitadas hasta validar cuentas y sandboxes reales.
Se conserva el contenido anterior según la decisión de añadir secciones al final.

Como administrador del CPPP, quiero configurar cómo se cobra cada curso, para ofrecer
pago previo, pago solo por la constancia o gratuidad. Como participante, quiero conocer
el importe antes de inscribirme y que el acceso y la entrega de mi constancia respeten
las condiciones aceptadas. Origen: HU-53, acuerdo A-05 del 09/11/2026; afecta HU-20,
HU-32 y RF-22/RF-24/RF-25. Planning Poker pendiente, sin estimación inventada.

Confirmado expresamente por el usuario:

- Tres modalidades de cobro, independientes de `PRESENCIAL/VIRTUAL/HIBRIDA`.
- Pago previo: plazo configurable y obligatorio por curso, contado desde la inscripción.
- Conservar modalidad, monto y plazo de cada inscripción; editar el curso afecta solo a nuevas inscripciones.
- Integrar pagos reales mediante **Izipay y Culqi**, además de **efectivo presencial registrado por un administrador**.
- Efectivo no significa el servicio PagoEfectivo ni códigos CIP.
- Cuatro bloques documentados dentro de `SPEC.md`, con plan y tareas en `tasks/`.

Decisiones técnicas implementadas: moneda PEN; importes exactos en céntimos;
plazo expresado en minutos enteros positivos, sin valor por defecto; actualización
de cobro mediante `PATCH /api/cursos/:id/cobro`; cancelación persistida en hasta
60 segundos tras vencer, mientras el servicio esté operativo. El bloqueo de acceso
y el cómputo de cupos vencidos deben ser efectivos desde el vencimiento, sin esperar
ese procesamiento. El plazo técnico admite 1–525600 minutos y el importe del curso
hasta S/ 9999999999.99. Culqi aplica además su límite de producto al iniciar cargos;
los límites del comercio Izipay se deben acreditar en su sandbox antes de habilitarlo.

## Mapa de capacidades aprobado

| Id estable | Objetivo y límite | Depende de | Contrato que ofrece |
| --- | --- | --- | --- |
| politica-cobro | Crear, editar y mostrar condiciones de la oferta | Ninguno | Política validada y versión de condiciones |
| pagos-cursos | Obligaciones, Izipay, Culqi, efectivo y verificación | politica-cobro | Hecho financiero persistido, consultable e idempotente |
| inscripcion-acceso | Inscripción, reserva, vencimiento, cupos y autorización | politica-cobro, pagos-cursos | Intento de inscripción y derecho efectivo de acceso |
| constancias | Elegibilidad, retención y entrega | politica-cobro, pagos-cursos, inscripcion-acceso | Estado de entrega y documento emitido una sola vez |

Orden: `politica-cobro → pagos-cursos → inscripcion-acceso → constancias`.
Las interfaces proveedoras se describen en su bloque. Pagos no importa constancias
ni decide aprobación académica: los consumidores aplican los hechos financieros.
Se evitan dependencias circulares y un bus genérico de eventos.

## Revisión inicial del código e inconsistencias

| Evidencia local | Comportamiento actual | Brecha para HU-53 |
| --- | --- | --- |
| `backend/src/modules/cursos/cursos.repositorio.ts` | `costo > 0` genera `PENDIENTE_PAGO`; costo cero, `EN_CURSO` | No distingue cobro de curso y de constancia; no guarda condiciones históricas ni vencimiento |
| Mismo repositorio y migración `0012-inscripcionPendiente.sql` | Cupos cuentan todas las filas; inscripción única por curso/persona | No hay cancelación, liberación ni intentos sucesivos auditables |
| `cursos.rutas.ts`, `frontend/src/servicios/cursos.ts` | El cliente llama PUT para editar; backend y matriz de permisos no lo implementan | La edición del cobro necesita persistencia real; MSW no la acredita |
| Detalle y descarga de materiales; módulos de clases/asistencia/reuniones | Autorización por sesión/rol o pertenencia a clase | No existe una regla común que impida el acceso de una reserva impaga |
| `certificados.repositorio.ts` | Emisión actual restringida a presencial, participación y costo cero | El costo bloquea toda emisión; falta retención financiera separada |
| `certificados.modelo.ts` y `historial.repositorio.ts` | Validez documental: VALIDO/ANULADO/REEMPLAZADO; deuda derivada de inscripción pendiente | Deuda de constancia y retención no equivalen a inscripción pendiente |
| [Matriz CPPP](docs/enfoqueCppp.md) | RF-22, RF-24 y RF-25 pendientes | No hay pasarela ni efectivo real; HU-53 amplía el alcance originalmente diferido a HU-32 |
| `tasks/todo.md` | Marcadores de conflicto y secciones duplicadas ya versionados | Se preservan; su resolución queda fuera de esta propuesta |

La fuente literal completa de Requisitos v4/RF-25 no está disponible en el repositorio.
Se usan los criterios entregados, la matriz CPPP y [las reglas de certificados](docs/esp/certificados.md);
no se declara cotejado el texto original. La regla académica implementada exige 80 %
de asistencia, sesiones finalizadas y cierre dentro de siete días de la última sesión.
HU-53 modifica la condición financiera; no añade exámenes, cómputo académico virtual
ni firmas institucionales reales. La emisión actual sigue marcada como demostración.

## Especificación del bloque politica-cobro

Responsable de la oferta vigente; no confirma pagos ni cambia inscripciones existentes.
Propone `modalidadCobro` con valores `PREVIO`, `CERTIFICADO` y `GRATUITO`.
Mantiene `costo` por compatibilidad: representa el único importe exigible según la
modalidad. En las decisiones y registros financieros se usa `importeCentimos`,
entero exacto calculado en servidor desde el decimal validado, y `moneda: 'PEN'`.

| Modalidad visible | Importe | Al inscribirse | Acceso del participante | Constancia al cumplir requisitos |
| --- | --- | --- | --- | --- |
| Pago antes de llevar el curso | Mayor que cero | PENDIENTE_PAGO, con vencimiento | Tras pago verificado dentro de reserva vigente | Sin segundo cobro |
| Pago solo por el certificado | Mayor que cero, identificado como importe de constancia | EN_CURSO, confirmada | Inmediato | RETENIDA hasta pago verificado |
| Gratuito | Cero | EN_CURSO, confirmada | Inmediato | Sin cobro |

`plazoPagoMinutos` es obligatorio para PREVIO y no se aplica a las otras modalidades.
Rechazar cero, negativos, fracciones, valores fuera de rango y combinaciones incoherentes.
El servidor valida, aunque el formulario ya valide. No se confunde el medio de pago
con la modalidad de cobro. Cada medio ofrecido debe admitir el importe de la obligación;
no se redondea, fracciona ni sustituye silenciosamente un importe fuera de sus límites.

ADMIN activo crea y modifica condiciones. Se propone una actualización acotada de
cobro mediante PATCH, usada por un control identificado como «Guardar condiciones
de cobro» en la edición. No simula guardar otros campos mediante el PUT inexistente.
Rechazar cambios en cursos cerrados; comprobar versión de política al editar e
inscribirse para evitar aceptar un precio distinto del mostrado sin confirmación.
La transacción de inscripción fija las condiciones realmente aceptadas.

Catálogo público, catálogo privado y detalle muestran modalidad, monto, moneda y,
para PREVIO, duración del plazo antes de inscribirse. CERTIFICADO debe decir que el
curso se lleva sin cobro y cuánto cuesta la constancia; no presentarlo como totalmente
gratuito. El visitante solo ve la oferta y datos institucionales/profesionales ya
permitidos; nunca deudas, alumnos, DNI, referencias de pago ni datos de pasarelas.

## Especificación del bloque pagos-cursos

Una obligación pertenece a una persona y a un intento concreto de inscripción;
incluye concepto CURSO o CONSTANCIA y la copia inmutable de sus condiciones.
PREVIO genera obligación al reservar. CERTIFICADO la genera cuando se registra la
elegibilidad académica; no permite cobrar antes de acreditar esa elegibilidad.
GRATUITO queda EXENTO, sin operación financiera ni transacción ficticia.
Estado financiero, intento de transacción y estado académico son dimensiones distintas.

Entradas: obligación creada por el servidor, identidad del actor y medio elegido.
Salidas: identificadores locales estables, estado consultable y hecho financiero
verificado. La confirmación conserva proveedor/medio, identificador externo o recibo
interno, importe, moneda, fecha de verificación, referencia al intento y auditoría.
No se aceptan importes, propietarios ni estados «pagado» decididos por el navegador.

Integraciones propuestas, con contrato real y habilitación independiente:

- **Izipay:** producto Web Core propuesto. Token de sesión generado desde backend;
  checkout oficial y notificación IPN. Verificar firma con el procedimiento documentado,
  correlación, comercio, entorno, importe, moneda y estado final exigible del producto.
  Un error de comunicación, token generado o simple retorno visual no acredita cobro.
- **Culqi:** cargo único mediante su integración oficial y API v2. Verificar el recurso
  financiero con consulta autenticada al proveedor, correlación, comercio/entorno e
  importe/moneda. Un webhook recibido solo es una señal para verificar. No se inventa
  un esquema HMAC que la documentación del producto elegido no confirme.
- **Efectivo:** solo ADMIN activo registra recepción real, por el importe completo,
  con referencia interna única, momento de registro y auditoría. El participante no
  puede autoconfirmar. El recibo interno no se presenta como comprobante fiscal.

Persistir la obligación y la correlación antes de contactar al proveedor.
Idempotencia duradera por obligación/operación/evento/transacción, protegida también
con restricciones SQL. Repetir una solicitud con otra carga bajo la misma clave se
rechaza. Solo puede existir un intento externo activo o incierto por obligación.
Tras timeout o caída entre cobro y persistencia, conciliar antes de reintentar, cambiar
de pasarela o registrar efectivo. La integración debe disponer de un mecanismo
verificado para localizar esa operación; si el producto no lo permite, no se habilita
un reintento automático inseguro.

Confirmar y aplicar efectos locales con recuperación persistente tras reinicios,
sin depender de la vuelta del navegador. Notificaciones duplicadas o fuera de orden
no duplican cobros, cupos, matrículas en sesiones ni documentos, y un evento de fallo
antiguo no revierte un pago confirmado. Una segunda confirmación financiera inesperada
se conserva como incidencia conciliable; nunca se borra para ocultar un doble cargo.

Un pago verificado recibido después de cancelar la reserva se registra como hecho
financiero y queda pendiente de conciliación administrativa. No reactiva una reserva
cancelada ni sobreinscribe un cupo reasignado. La regla de expiración y la conciliación
son independientes. No se incluyen reembolsos automáticos, pagos parciales, cuotas,
recurrencia, SUNAT ni correo transaccional nuevo; se ofrece confirmación interna
consultable y comprobante interno. La política operativa de devolución queda pendiente.

## Especificación del bloque inscripcion-acceso

Cada intento tiene identificador estable y conserva política, importe, moneda,
plazo, `inscritoEn` y `venceEn`. Un refresh o reintento idempotente no reinicia el plazo.
Se conservan estados existentes; se añade cancelación explícita por vencimiento sin
borrar inscripciones, asistencias ni auditoría. Tras cancelación puede crearse otro
intento si el curso sigue publicado y hay cupo, con las condiciones vigentes.

Para PREVIO, la reserva ocupa un cupo hasta `venceEn`. Desde `ahora >= venceEn`,
sin pago aplicado oportunamente, se considera vencida y sin acceso. El cómputo de
cupos excluye reservas vencidas/canceladas, incluso si el procesador está atrasado.
El proceso automático persiste cancelación y libera una sola vez; funciona sin
navegador abierto, recupera retrasos al arrancar y tolera varias instancias.
Objetivo propuesto de persistencia: hasta 60 segundos con servicio operativo;
una interrupción no amplía el derecho de acceso ni el plazo contractual.

La activación exige pago verificado aplicado bajo bloqueo a una reserva aún vigente.
La fecha declarada por el navegador o un webhook sin verificar no decide el derecho.
Serializar inscripción, pago, expiración y última plaza con orden de bloqueos único.
Revisar expresamente el actual bloqueo de clase previo al de curso en asistencia:
no introducir el ciclo curso→clase / clase→curso. Leer el reloj de base de datos tras
adquirir bloqueos para no usar una hora anterior a una espera de bloqueo.

La política efectiva protege en servidor: detalle de contenidos/materiales privados,
descarga PDF, enlaces y videos, inscripción manual en sesiones, registro de asistencia
y credenciales/acceso a reuniones del curso. Una fila manual en `enrollments` no
sustituye el derecho del curso. Mantener permisos de ADMIN e INSTRUCTOR asignado
para gestión y las clases históricas independientes con `curso_id` nulo.
El catálogo y el resumen comercial pueden seguir visibles; no se filtran URLs
privadas en una respuesta que luego el frontend solo oculta.

## Especificación del bloque constancias

La decisión académica permanece en certificados. Pagar no convierte a una persona
en elegible. Para el alcance académico actualmente implementado, al cerrar el curso:

- GRATUITO elegible: emisión sin pago.
- PREVIO elegible y pago confirmado: emisión sin nuevo cargo.
- CERTIFICADO elegible: registrar copia de elegibilidad, condiciones y datos del
  documento; estado de entrega RETENIDA mientras exista deuda. Cuando se confirme
  el pago, emitir y entregar exactamente una constancia, también si el curso ya cerró.

RETENIDA es un estado de entrega financiera separado de VALIDO/ANULADO/REEMPLAZADO.
No se publica un código utilizable ni un PDF válido mientras esté retenida y no suma
horas certificadas. La restricción cubre todas las descargas, incluido historial,
y también excepciones y correcciones administrativas: una excepción académica no
perdona la deuda. El propietario y ADMIN pueden consultar la retención sin exposición pública.

Guardar la elegibilidad en el cierre oportuno permite liberar después del pago sin
reabrir el curso ni exigir de nuevo la ventana de siete días. El documento usa la
copia de datos académicos del cierre y registra la fecha real de emisión. Historial,
«Mis cursos», cierre y gestión de certificados muestran inscripción, deuda y entrega
por separado. Conservar documentos históricos, anulación/reemplazo y marca de demo;
HU-53 no acredita una firma de producción ni amplía automáticamente el alcance
académico a exámenes o modalidades sin evaluación implementada.

## Contratos HTTP implementados

Todas las rutas nuevas deben figurar en la matriz central de permisos. Respetar el
formato de errores existente; las rutas siguientes están implementadas y probadas
contra Fastify/PostgreSQL. La activación comercial de pasarelas sigue pendiente.

| Método y ruta | Actor | Resultado y límite |
| --- | --- | --- |
| POST /api/cursos | ADMIN | Añade política validada a la creación actual |
| PATCH /api/cursos/:id/cobro | ADMIN | Actualiza solo condiciones futuras, con control de versión |
| GET /api/publico/cursos y consultas actuales de curso | Público/autenticado según ruta existente | Oferta con modalidad e importe; datos privados solo para actor autorizado |
| GET /api/pagos/:id | Propietario o ADMIN | Obligación y confirmación interna sin secretos ni datos de tarjeta |
| POST /api/pagos/:id/intentos | Propietario | Inicia Izipay o Culqi con clave de idempotencia, según disponibilidad |
| POST /api/pagos/notificaciones/:proveedor | Proveedor verificado | Izipay/Culqi permitidos; confirmación solo tras verificación específica |
| POST /api/pagos/:id/conciliar | ADMIN | Verifica la operación de esta obligación mediante API de la pasarela; no crea otro cargo |
| POST /api/pagos/:id/efectivo | ADMIN | Registra efectivo real y auditado, sin carreras con intentos externos |

Conservar `POST /api/cursos/:id/inscribirme` y sus resultados existentes; añadir
identificador de intento, copia de condiciones, vencimiento y obligación cuando
corresponda. Respuestas con discriminantes explícitos: un estado desconocido nunca
se interpreta como confirmado. Invariantes de propiedad se comprueban en la escritura,
no solo en la interfaz. Diferenciar 401/403, 404, validación 422, conflicto 409 y
proveedor no disponible 503 según el patrón existente; no devolver trazas internas.

## Migración y compatibilidad propuestas

Añadir migraciones nuevas después de la última existente al implementar; no editar
ni renombrar migraciones históricas. Separar expansión de esquema, regularización
y activación; sin eliminación de columnas ni cambio de contratos externos.

Para la oferta actual, costo cero puede inicializar GRATUITO. Un curso con costo
positivo necesita modalidad y plazo explícitos antes de aceptar nuevas inscripciones.
No inventar retrospectivamente modalidades, montos aceptados, fechas límite ni pagos
a partir del precio actual. Inscripciones históricas confirmadas/terminadas conservan
sus derechos, sin considerarse «pagadas» por esa sola condición. Las pendientes antiguas
se identifican para regularización auditada: no caducan con una fecha inventada.
El tratamiento y comunicación de esas reservas requieren aprobación antes de activar
la migración sobre datos reales; no se bloquean ni cancelan masivamente sin ese acuerdo.

Ensayar sobre PostgreSQL 17 aislado con muestras gratuitas, con costo, pendientes,
terminadas y con documentos emitidos; comprobar cupos, referencias e historial.
Backfill por lotes acotados y reanudables. El repositorio tiene migración hacia
adelante, sin comando de rollback: definir y probar recuperación específica.
Revertir el binario antiguo tras activar nuevas modalidades puede saltarse los
controles: ante incidente, detener nuevas inscripciones/intentos, conservar controles
de acceso y conciliación y aplicar recuperación compatible. Una restauración solo
es aceptable si no pierde hechos financieros posteriores; no borrar pagos reales
para volver a una versión anterior.

## Stack, estructura y estilo

Versiones declaradas en manifiestos, no resolución exacta del árbol instalado:
Node >=24, npm >=11, Fastify ^5.12.8, pg ^8.16.3, Zod ^4.6.7, React ^19.2.8,
React Router ^7.18.4 y Playwright ^1.63.0. Backend TypeScript ^7.0.2 y frontend
~6.0.2; pruebas con node:test y Vitest ^5.0.3. Entorno de integración: PostgreSQL 17
y Redis 8, según configuración del repositorio. La política actual no versiona
lockfile npm; no se declara satisfecha la reproducibilidad exigida por el checklist
de seguridad ni se cambia esa política dentro de esta propuesta.

Código backend en `backend/src/modules/{cursos,pagos,certificados,historial,asistencia,reuniones}`
(pagos es propuesto); reglas de autorización en `backend/src/plugins/permisos.ts`;
migraciones en `backend/migraciones/`; pruebas en `backend/test/` y
`backend/test/integracion/`. Interfaz en `frontend/src/paginas/` y contratos en
`frontend/src/servicios/`; MSW en `frontend/src/mocks/`. Recorridos demo/reales en
`e2e/prb/demo/` y `e2e/prb/real/`. No crear estructura alternativa de pruebas.

Ejemplo de contrato, solo documental:

```typescript
type ModalidadCobro = 'PREVIO' | 'CERTIFICADO' | 'GRATUITO';
type PoliticaCobro = {
  modalidadCobro: ModalidadCobro;
  importeCentimos: number;
  moneda: 'PEN';
  plazoPagoMinutos: number | null;
};
```

Aplicar AGENTS.md: camelCase para funciones/variables, PascalCase para tipos/componentes
y archivos nuevos sin guiones bajos, siguiendo el estilo de cada carpeta. Conservar
columnas SQL, variables de entorno y contratos externos existentes; convertir con
alias al entrar a la aplicación. Seguir el formato local; sin refactor ajeno.

## Criterios de aceptación verificables

| Id | Condición observable | Bloque |
| --- | --- | --- |
| HU53-01 | ADMIN crea un curso en cada modalidad; servidor rechaza combinaciones inválidas y otros roles | politica-cobro |
| HU53-02 | ADMIN edita realmente el cobro; nueva inscripción usa nuevas condiciones y las anteriores permanecen idénticas | politica-cobro |
| HU53-03 | Catálogo y detalle indican modalidad, importe PEN y plazo de pago previo antes de inscribirse, sin datos privados | politica-cobro |
| HU53-04 | Izipay realiza un cobro de prueba con verificación servidor y correlación local; no basta retornar del checkout | pagos-cursos |
| HU53-05 | Culqi realiza un cobro de prueba verificado por API autenticada; no basta crear un token ni recibir un webhook | pagos-cursos |
| HU53-06 | Solo ADMIN registra efectivo real exacto con recibo interno único y auditoría; el participante recibe 403 | pagos-cursos |
| HU53-07 | Duplicados, concurrencia entre medios, timeout y caída tras cobro se concilian sin duplicar efectos ni reintentar a ciegas | pagos-cursos |
| HU53-08 | Firma/recurso inválido, importe/moneda/comercio/entorno/propietario incorrectos no confirman; las credenciales no salen al cliente/log | pagos-cursos |
| HU53-09 | Pago previo reserva un cupo y guarda plazo desde inscripción; repetir la solicitud no cambia condiciones ni vencimiento | inscripcion-acceso |
| HU53-10 | Sin derecho vigente no se obtienen materiales, descargas, asistencia ni credenciales de reunión, incluso con inscripción manual de clase | inscripcion-acceso |
| HU53-11 | En el límite de vencimiento se deniega acceso y el cupo puede reasignarse; el proceso cancela en hasta 60 s operativo, una sola vez | inscripcion-acceso |
| HU53-12 | Pago verificado oportuno confirma reserva y acceso; carrera pago/vencimiento/último cupo nunca sobreinscribe | inscripcion-acceso |
| HU53-13 | Pago tardío se conserva para conciliación; no reactiva la reserva ni afecta otro intento o un cupo reasignado | pagos-cursos, inscripcion-acceso |
| HU53-14 | CERTIFICADO confirma inscripción y permite cursar sin pago; al cumplir requisitos registra entrega RETENIDA | constancias |
| HU53-15 | Pago verificado de constancia libera una sola emisión desde elegibilidad guardada, aun después del cierre y sin reabrirlo | constancias |
| HU53-16 | Retenida no tiene documento/código público válido ni suma horas; excepciones y rutas alternativas no eluden la deuda | constancias |
| HU53-17 | GRATUITO permite inscripción y constancia elegible sin pago; PREVIO pagado no vuelve a cobrar constancia | constancias, inscripcion-acceso |
| HU53-18 | Historial, Mis cursos y administración distinguen deuda, inscripción y entrega; no confunden EXENTO con PAGADO | constancias, inscripcion-acceso |
| HU53-19 | Migración preserva inscripciones, documentos y derechos históricos sin inventar pagos/plazos; recuperación ensayada | Todos |
| HU53-20 | Recorridos y controles funcionan contra backend/BD reales; ambos sandboxes, revisión y evidencia están registrados | Todos |

## Estrategia de pruebas y comandos

Implementación aprobada: TDD por incremento, reproducir fallo esperado, cambio
mínimo y refactor con mismas pruebas. Si algo falla, investigar causa raíz antes de
corregir. El usuario realiza cada commit manualmente; el agente prepara el mensaje
y registra evidencia de red/green. Mantener suites existentes y cobertura actual
de asistencia >=60 % de líneas, ramas y funciones, sin skips ni umbrales rebajados.

Comandos desde la raíz. El inventario de archivos y pruebas realmente ejecutadas está en
[la guía de cobro](docs/esp/cobroCursos.md); los nombres de pruebas de esta estrategia
se consolidaron en `cobroCurso.test.ts` y `pagosCurso.test.ts`:

```bash
npm run dev
node --import tsx --test backend/test/politicaCobro.test.ts
node --import tsx --test --test-concurrency=1 backend/test/integracion/pagosCurso.test.ts
npm exec -w frontend -- vitest run src/paginas/cursos/CobroCursoFormulario.test.tsx
npm run typecheck -w backend
npm exec -w frontend -- tsc -p tsconfig.app.json --noEmit
npm exec -w frontend -- tsc -p tsconfig.node.json --noEmit
npm run e2e:tipos
npm run lint -w frontend
npm test
npm run test:integracion
npm run test:cobertura
npm run e2e -- --grep 'HU53-'
npm run e2e:real -- cobroCurso.spec.ts
npm run migrate:estado
```

Integración y E2E reales usan BD/Redis desechables, nunca la BD compartida o de
producción. Los filtros HU53 serán nombres de pruebas nuevos, no una suite existente.
Migraciones se ensayan con `npm run migrate` exclusivamente sobre esa BD aislada.
Los E2E de tarjetas se separan del flujo por defecto y apuntan solo a sandboxes;
sus comandos exactos dependerán del producto/SDK verificado al implementar.
Mocks sirven para casos deterministas y errores; no acreditan una pasarela real.
No se considera completado HU53-04/05/20 sin evidencia real de ambos sandboxes.

`npm run build` y variantes son **manuales del usuario**. El agente no los ejecuta,
tampoco `npm run verificar`. Las verificaciones funcionales se ejecutan en entorno aislado; no se ejecutan builds
funcionales, instalaciones, migraciones ni builds.

## Seguridad, revisión y límites de actuación

Siempre: validación en fronteras, SQL parametrizado, autorización por rol y objeto,
importe del servidor, idempotencia durable, conservación de auditoría y tratamiento
de errores sin secretos. Modelar amenazas sobre navegador→API, proveedor→notificación
y ADMIN→registro de efectivo: suplantación, alteración de importe, IDOR, repetición,
denegación de servicio y repudio del registro. Pruebas negativas por cada frontera.

Datos de tarjeta/CVV van al checkout del proveedor; no se almacenan ni pasan por
logs del CPPP. Claves secretas solo en backend y separadas entre test/producción;
tokens efímeros no se registran. Minimizar datos de facturación enviados al proveedor,
definir finalidad/retención de auditoría y no copiar payloads con datos personales
a informes de prueba. HTTPS, proveedores/orígenes permitidos, límites de cuerpo,
frecuencia y timeout; redirects internos validados y CSP acotada a los hosts
necesarios verificados, sin comodines para hacer funcionar el SDK.

La revisión final aplicará `code-simplification` sin cambiar comportamiento;
`code-review-and-quality` sobre corrección, seguridad, rendimiento, legibilidad y
mantenibilidad; `security-and-hardening` y las listas
[Definition of Done](/home/lovito99/.agents/agent-skills/references/definition-of-done.md)
y [Security Checklist](/home/lovito99/.agents/agent-skills/references/security-checklist.md).
Registrar controles aprobados, pendientes y no aplicables con justificación.
La política sin lockfile es una discrepancia previa a resolver por decisión del
proyecto, no motivo para marcar toda la seguridad como aprobada.

Consultar antes de ampliar alcance, introducir dependencias o modificar CI, resolver
condiciones históricas desconocidas o habilitar producción. La aprobación de esta
especificación autorizará diseñar las migraciones descritas, no aplicarlas a datos
reales. Nunca inventar pagos/credenciales, debilitar permisos, borrar pruebas para
pasar CI ni modificar historia ajena. Git de escritura, merges, PR, etiquetas y
publicación corresponden al usuario. No hacer push ni publicar.

## Pendientes y condiciones para publicar

- Aprobar esta especificación y el plan; estimación en Planning Poker por el equipo.
- CPPP aporta cuentas de comercio de Izipay y Culqi, producto contratado, acceso a
  sandboxes, límites y credenciales por un canal seguro; no se solicitan claves por chat.
- Configurar dominios HTTPS, callbacks/IPN/webhooks, secretos y permisos del comercio;
  confirmar cómo consultar operaciones inciertas antes de habilitar reintentos.
- Acordar tratamiento de pendientes históricas, límites de plazo y política operativa
  de pagos tardíos/devolución; aportar el texto completo de RF-25 v4 para cotejo.
- Implementar y demostrar los veinte criterios, revisar seguridad/DoD, ensayar
  recuperación y definir responsable de conciliación de efectivo/pagos tardíos.
- Antes de activar: evidencia de ambos sandboxes, alertas de obligaciones inciertas,
  reservas vencidas sin procesar y entregas retenidas ya pagadas; build manual,
  revisión humana y configuración de producción. La firma real de constancias tiene
  su propio pendiente; no eliminar la marca de demostración para simularla.

No hay autorización de publicación ni cobros reales en esta fase. Una integración
sandbox verificada no implica comercio de producción habilitado. Los mensajes de
commit serán recomendaciones manuales, sin cambiar versiones ni etiquetas.
La propuesta documental anterior queda sustituida por la clasificación del cambio
funcional: desde la base local `v2.0.0.1.0`, se propone `v3.0.0.0.0` para esta entrega,
por exigir `versionCobro` al aceptar nuevas inscripciones pagadas y restringir
contenido que antes se entregaba con solo una sesión iniciada. Es una recomendación
condicional; no se crearon commits ni etiquetas ni se cambiaron versiones npm.

## Fuentes oficiales consultadas para HU-53

Consultadas el 15/11/2026; verificar producto y versión exactos antes de implementar.

- [Izipay Web Core: inicio rápido y generación backend del token](https://developers.izipay.pe/web-core/quickstart/).
- [Izipay: notificación IPN](https://developers.izipay.pe/web-core/notifications/) y [validación de firma](https://developers.izipay.pe/web-core/Modalidades/firma-validation/).
- [Culqi: cargos únicos](https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/cargos/), [webhooks](https://docs.culqi.com/es/documentacion/pagos-online/webhooks/) y [referencia API](https://apidocs.culqi.com/).
- [OWASP: integración de pasarelas, verificación e idempotencia](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html).
- [PostgreSQL 17: bloqueos de fila](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS) y [reloj de transacción frente a reloj real](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).


## Estado verificable de la implementación

- Política, edición PATCH, snapshots, reservas, control de acceso, efectivo y entrega
  retenida tienen implementación contra API/BD real. El documento operativo y la
  matriz de aceptación se mantienen en [docs/esp/cobroCursos.md](docs/esp/cobroCursos.md).
- La activación de reservas consume hechos financieros mediante el trigger
  `aplicarPagoReserva`; comparte transacción y lock del curso con el pago. No hay
  imports desde pagos hacia cursos/constancias ni un bus de eventos genérico.
- El servidor procesa expiraciones y entregas cada 30 s; la conciliación va en un
  ciclo independiente cada 60 s para no retrasar acceso por una pasarela caída.
- El histórico con condiciones desconocidas queda inventariado, sin pagos/plazos
  fabricados. La gratuidad legada se decide con evidencia congelada al migrar o
  al crear una inscripción sin intento en una oferta entonces gratuita; cambiar
  la oferta después no acredita derechos antiguos. No hay regularización masiva
  automática sin el acuerdo de negocio pendiente.
- Adaptadores HTTP, verificación de firma/recursos, checkout y recuperación están
  implementados para Izipay Web Core y Culqi Checkout Custom. Los contratos se
  probaron con respuestas simuladas; eso no acredita cobros en ambos sandboxes.
- Git, build, aprobación de entrega y publicación siguen siendo manuales.

---

# HU-26: Sesiones virtuales seguras

Estado: **aprobada por el usuario el 15/11/2026 («implementa todo») e implementada en local.**
Las preguntas abiertas se resolvieron con las recomendaciones (ver «Decisiones tomadas»).
Fecha de revisión: 16/11/2026, America/Lima. Rama `SCRUM-24-hu-26-sesiones-virtuales-seguras`,
base `95fe541` (contiene la etiqueta `v3.0.0.0.0`). Plan y seguimiento: sección HU-26 de
[tasks/plan.md](tasks/plan.md) y [tasks/todo.md](tasks/todo.md). Las secciones T-20 y
HU-53 anteriores se conservan sin cambios.

## Objetivo y caso de uso

Como instructor, quiero dictar sesiones en una videoconferencia propia del subdominio
donde solo yo controle quién comparte pantalla, para que los colegiados se capaciten
sin interrupciones y el CPPP no dependa de servicios pagados (AG-C01.1). Origen: la
entrevista al representante del CPPP (pregunta 4: un intruso compartió contenido
inapropiado en un evento de ~1000 personas) y la reunión NR-05, NR-06 y NR-07.

Actores: **instructor** asignado a la sesión (anfitrión y moderador), **administrador**
(gestión y moderador), **colegiado** (rol `agremiado`) inscrito con acceso vigente al
curso, y **Jitsi** como servidor audiovisual propio que valida el token y la moderación.

Éxito: ningún colegiado puede entrar sin estar inscrito ni pasar la sala de espera,
publicar pantalla sin permiso aunque manipule su navegador, ni volver tras ser
expulsado; y su asistencia virtual se calcula con eventos del servidor, no del navegador.

## Mapa de capacidades (Fase 0)

La historia agrupa capacidades que se pueden verificar y entregar por separado. La
propia historia pide dividirla. Propuesta, con identificadores estables:

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `sala-segura` | Licencias, configuración Jitsi verificada, acceso solo desde la plataforma, sala de espera obligatoria y aviso de grabación | — |
| `control-sala` | Políticas persistentes de pantalla, micrófono y mano; aplicación en servidor; expulsión sin reingreso | `sala-segura` |
| `asistencia-virtual` | Eventos de entrada/salida desde Prosody, porcentaje mínimo y registro que cuenta para el 80 % | `sala-segura` |
| `difusion-masiva` | Modo visitantes/transmisión para ~1000 personas | `control-sala` — **fuera de alcance** |
| `sesion-ambas` | Transmitir el aula de una sesión «ambas» (HU-36) | HU-36 — **bloqueado** |

Orden: espiga técnica → `sala-segura` → `control-sala` y `asistencia-virtual` (pueden
ir en paralelo). Se recomienda registrar en Jira tres historias: HU-26a acceso seguro
y sala de espera, HU-26b control de pantalla y expulsión, HU-26c asistencia virtual, y
re-estimarlas en Planning Poker. Las dos últimas filas quedan como historias aparte.
Este documento especifica los tres módulos dentro de alcance en una sola sección
para no fragmentar el SPEC.md compartido; el usuario puede pedir archivos por módulo.

## Revisión del código actual e inconsistencias

| Hallazgo | Evidencia | Implicación |
|---|---|---|
| El prototipo «Aula virtual» **ya está en el repositorio** | Commit `0f1aaef` (28/10/2026): sala propia con lib-jitsi-meet, personas, chat, pantalla, mano, reacciones y comparación de inscritos; [docs/reuniones.md](docs/reuniones.md) | Contradice «aún no está en GitHub». Se asume que ese commit es el prototipo; confirmar si existe otro. |
| No hay registro de licencias de terceros | `infraestructura/jitsi/servidor/` (docker-jitsi-meet, con `LICENSE` Apache-2.0) está ignorada por Git; `version.json` solo guarda versión y checksum | Falta el aviso exigido por la historia: proyecto, licencia, versión y qué se modificó. |
| La sala usa lib-jitsi-meet, no la API IFrame | `frontend/src/servicios/salaJitsi.ts` | Las notas técnicas citan `participantJoined`/`participantLeft` de IFrame; los eventos del navegador no son confiables para asistencia. Se usarán eventos del servidor (`event_sync`). |
| Políticas de sala rechazadas | `PATCH /api/reuniones/:id/politicas` responde 422 ante cualquier restricción | Contradice NR-07. Las columnas existen en `reuniones`, pero `pantallaPermitida` es `true` por defecto. |
| Moderación solo manual y efímera | `moderacionSala.ts`: el anfitrión activa la moderación de `desktop` en Opciones, durante la llamada | Si el anfitrión no la activa, un colegiado puede compartir pantalla: es el incidente reportado. |
| Expulsión incompleta | `retirar` responde `desconexionAudiovisual: false`; el token Jitsi dura 300 s | El expulsado sigue conectado y puede reutilizar un token ya emitido durante 5 min. |
| Sala de espera inexistente | `salaEsperaHabilitada` siempre `false` (422 si se pide) | NR-06 sin implementar. |
| Sin asistencia virtual | `attendances` solo se llena por QR; `docs/reuniones.md` lo declara pendiente | `asistenciaCurso` ya cuenta cualquier fila de `attendances`: bastará con registrar el origen. |
| Los cursos `VIRTUAL` no admiten sesiones | `programarSesion` exige `modalidad in ('PRESENCIAL','HIBRIDA')` y las reuniones requieren una sesión (`classes`) | Un curso virtual no puede tener aula virtual. |
| No existe la sesión «ambas» de HU-36 | Modalidad solo a nivel de curso (`PRESENCIAL`, `VIRTUAL`, `HIBRIDA`) | El criterio de transmitir el aula queda bloqueado por HU-36. |
| Solo el administrador crea reuniones | `POST /api/reuniones` filtra `creador.role in ('admin')` | El instructor de la historia no puede crear su sala; sí iniciarla y configurarla. |
| Documentación desactualizada | `docs/reuniones.md` menciona «coordinador»; HU-35 lo migró a `admin` | Corregir al tocar el documento. |

## Hallazgos técnicos sobre Jitsi (imagen local `stable-11248-2`)

Revisados en la imagen y **comprobados en ejecución en la espiga T26-01**
([evidencia](docs/esp/sesionesVirtuales.md)).

- `mod_av_moderation_component` admite `audio`, `video` y `desktop`, pero **la espiga
  demostró que la moderación `desktop` no impide que un cliente manipulado publique
  su pantalla**. La moderación de vídeo bloquea todo el vídeo, incluso el autorizado.
  Por eso se aplicó el plan B (pregunta 7): vigilante en la sala del moderador.
- `/prosody-plugins-contrib` (jitsi-contrib, **Apache-2.0**) incluye `event_sync`, que
  envía `occupant/joined` y `occupant/left` con el `id` del contexto JWT (no el nombre
  elegido por el cliente) y admite cabecera `Authorization` y reintentos.
- También incluye `token_lobby_ondemand`: el token con `"lobby": true` envía a la sala
  de espera; el token del anfitrión sin ese campo entra directo.
- `mod_muc_auth_ban` solo actúa con inquilinos `vpaas-magic-cookie-`: no sirve aquí.
- `mod_visitors` existe y es la vía nativa para audiencias grandes (`difusion-masiva`).

## Supuestos (corregir antes de aprobar)

1. Se integra el prototipo existente (`0f1aaef`), sin reescribir la sala ni cambiar a IFrame.
2. La sala de espera es **obligatoria** para colegiados; no se ofrece como opción
   desactivable, porque además cierra la ventana de reingreso del expulsado.
3. Para unas 1000 personas no se promete una sola sala interactiva; se difiere a `difusion-masiva`.
4. Grabación: el servidor no graba (Jibri desactivado). Se implementa solo el aviso
   previo obligatorio cuando el instructor declara que grabará por su cuenta.
5. Duración de referencia de la asistencia: desde que la reunión pasa a `iniciada`
   hasta que se finaliza. El umbral por defecto es 70 %, configurable de 1 a 100.
6. Un colegiado expulsado no obtiene asistencia virtual de esa sesión.
7. Se habilitan sesiones en cursos `VIRTUAL` y el instructor asignado puede crear
   la reunión de su sesión, además del administrador.
8. No se añaden dependencias npm. Los módulos de Prosody vienen en la imagen fijada.

## Alcance

Incluye: espiga de verificación con dos navegadores y un cliente manipulado; registro
de licencias; configuración reproducible de Jitsi (`preparar.mjs`); sala de espera y
admisión; políticas persistentes aplicadas en servidor; expulsión con desconexión y
sin reingreso; webhook de eventos; cálculo y registro de asistencia virtual; aviso de
grabación; documentación y pruebas.

Excluye: transmisión para ~1000 personas, sesión «ambas», grabación en servidor,
despliegue en el servidor del CPPP, medición de costos y correo de invitaciones.

## Criterios de aceptación

Cada criterio tiene identificador para rastrear su prueba.

**`sala-segura`**

- **HU26-01** Dado un usuario sin inscripción vigente (no inscrito, inscripción
  pendiente de pago o curso cerrado), cuando pide la credencial, recibe 403 y no se
  emite token. Dado un usuario sin sesión, recibe 401.
- **HU26-02** Dado un colegiado, cuando entra, lo hace solo desde `/reuniones/:id`
  con su sesión iniciada: el enlace no contiene credencial y la URL directa de Jitsi
  sin token es rechazada por el servidor (`ENABLE_GUESTS=0`, `JWT_ALLOW_EMPTY=0`).
- **HU26-03** Dado un inscrito, cuando entra, queda en la sala de espera hasta que el
  instructor lo admite; el instructor ve su identidad del JWT y puede admitir a uno,
  rechazar o «Admitir inscritos». Antes de que llegue un moderador nadie entra a la sala.
- **HU26-04** Dada una reunión con `grabacionPrevista`, cuando el colegiado va a entrar,
  ve el aviso (Ley 29733, AG-C01.2) y el backend no emite credencial sin su aceptación,
  que queda registrada con fecha. Sin grabación prevista no se muestra el aviso.
- **HU26-05** Existe un registro de terceros con proyecto, versión, licencia, origen
  y modificaciones (ninguna en código Jitsi; solo configuración y adaptador propio).

**`control-sala`**

- **HU26-06** Dado el instructor, cuando configura la sala, decide si los colegiados
  pueden compartir pantalla, activar micrófono o levantar la mano; se guarda en
  PostgreSQL y se valida (solo instructor asignado o administrador; reunión no cerrada).
- **HU26-07** Dado un colegiado sin permiso de pantalla, cuando intenta compartirla,
  el botón está deshabilitado **y**, si fuerza la publicación desde la consola, los
  demás no reciben su pantalla (moderación `desktop` en servidor, comprobada en T26-01).
  La política se aplica al conectarse el moderador, antes de admitir a nadie.
- **HU26-08** Dado un colegiado autorizado por el instructor (tras levantar la mano),
  puede compartir; al retirarle el permiso, su pantalla se detiene.
- **HU26-09** Dado el instructor, cuando expulsa a un colegiado, se cierran todas sus
  conexiones de esa sala, queda `retirado` y no puede volver a entrar a esa sesión:
  no recibe credencial nueva (403) y un token anterior todavía vigente solo lo deja
  en la sala de espera, donde aparece como «Expulsado» sin opción de admitirlo.
- **HU26-10** Ningún colegiado puede admitir, expulsar ni cambiar políticas aunque
  invoque la API de Jitsi o del backend: Prosody y el backend lo rechazan.
- **HU26-11** Si la mano no está permitida, el botón no se muestra. Se documenta que
  esta restricción es de interfaz, no un control de seguridad del servidor.

**`asistencia-virtual`**

- **HU26-12** Dado un colegiado inscrito, cuando entra y sale de la sala principal
  (no de la espera), el backend registra cada intervalo a partir de eventos firmados
  de Prosody, identificando al usuario por el `id` del JWT. Eventos duplicados o
  reintentados no duplican intervalos; eventos sin secreto válido responden 401.
- **HU26-13** Al finalizar la reunión se cierran los intervalos abiertos y se calcula,
  por inscrito, el porcentaje conectado (unión de intervalos de todas sus conexiones,
  sin contar solapamientos) respecto de la duración de referencia.
- **HU26-14** Si el porcentaje es menor que el mínimo de la reunión (70 % por defecto)
  no se cuenta la asistencia; si lo alcanza, se registra en `attendances` con origen
  `VIRTUAL` y cuenta para el 80 % del certificado. Una asistencia QR previa se conserva.
- **HU26-15** El instructor y el administrador ven el resultado por inscrito (minutos,
  porcentaje y si cuenta). Finalizar dos veces no cambia el resultado.

**Fuera de alcance, registrados**

- **HU26-16** (`sesion-ambas`) Dada una sesión «ambas», el aula se transmite a la sala
  virtual: bloqueado hasta que HU-36 defina ese tipo de sesión.
- **HU26-17** (`difusion-masiva`) Modo visitantes para la mayoría y sala interactiva
  para pocos: historia aparte con espiga de capacidad.

## Diseño propuesto

**Contrato Jitsi.** El token de colegiado añade `"lobby": true`; el de moderador no lo
lleva. `preparar.mjs` añade, de forma idempotente y sin rotar secretos existentes,
`ENABLE_LOBBY=1`, `token_lobby_ondemand`, el componente `event_sync` con
`api_prefix` hacia el backend y una cabecera `Authorization` con un secreto nuevo
`jitsiEventosSecreto` (distinto de `jitsiSecreto`, `JWT_SECRET` y `QR_SECRET`), y
desactiva grabación y transmisión de Jibri. La forma exacta de cargar módulos de
`/prosody-plugins-contrib` en Docker se decide en T26-01.

**Datos** (migración nueva `0032-sesionesVirtualesSeguras.sql`, sin tocar las aplicadas):

- `reuniones`: `"iniciadaEn"`, `"finalizadaEn"`, `"porcentajeMinimo"` (1–100, 70),
  `"manoPermitida"` (true), `"grabacionPrevista"` (false); `"pantallaPermitida"` pasa a
  `false` por defecto para reuniones nuevas. `"salaEsperaHabilitada"` queda en desuso
  (siempre obligatoria) y se conserva por compatibilidad.
- `"participantesReunion"`: `"avisoGrabacionAceptadoEn"`, `"retiradoEn"`.
- `"conexionesReunion"`: reunión, usuario, `"ocupanteJid"`, `"entradaEn"`, `"salidaEn"`;
  único por reunión, ocupante y entrada para la idempotencia.
- `"asistenciaReunion"`: reunión, usuario, segundos conectados, porcentaje, cuenta.
- `attendances.origen` (`'QR'` por defecto, `'VIRTUAL'`).

**API** (todas bajo JWT de la aplicación, salvo el webhook):

| Método | Ruta | Cambio |
|---|---|---|
| POST | `/api/reuniones` | Admite instructor asignado; sesiones de cursos `VIRTUAL` |
| PATCH | `/api/reuniones/:id/politicas` | Guarda pantalla, micrófono, mano, porcentaje y grabación; deja de responder 422 |
| POST | `/api/reuniones/:id/credencial` | Añade `lobby`; exige `aceptaGrabacion` si corresponde; registra la aceptación |
| POST | `/api/reuniones/:id/participantes/:usuario/retirar` | Registra `retiradoEn`; el cliente moderador expulsa sus conexiones |
| POST | `/api/reuniones/:id/finalizar` | Fija `finalizadaEn` y calcula la asistencia en la misma transacción |
| GET | `/api/reuniones/:id/asistencia` | Resultado por inscrito (instructor y administrador) |
| POST | `/api/jitsi/events/occupant/joined` y `/left` | Webhook de `event_sync`; secreto en tiempo constante; sin JWT de usuario; ignora salas desconocidas y la sala de espera |

**Interfaz.** Pantalla previa con aviso de grabación; estado «En sala de espera»;
panel del anfitrión con solicitudes, «Admitir inscritos» y expulsión; las políticas
guardadas se aplican al unirse el moderador; resultado de asistencia en la reunión finalizada.

## Pila, estructura y estilo

Backend Fastify + TypeScript + `pg` + zod (`backend/src/modules/reuniones`,
`backend/src/modules/jitsi`); migraciones SQL numeradas en `backend/migraciones`.
Frontend React + Vite (`frontend/src/paginas/reuniones`, `frontend/src/servicios`).
Infraestructura en `infraestructura/jitsi` (solo se versionan los scripts propios).
Nombres nuevos en camelCase/PascalCase y sin guiones bajos; las rutas del webhook
y las variables oficiales de Jitsi conservan su contrato externo. Ejemplo del estilo:

```ts
export function porcentajeConectado(intervalos: Intervalo[], referencia: Intervalo) {
  const unidos = unirIntervalos(intervalos.map(intervalo => recortar(intervalo, referencia)))
  const segundos = unidos.reduce((total, tramo) => total + (tramo.fin - tramo.inicio), 0)
  return { segundos, porcentaje: segundos * 100 / (referencia.fin - referencia.inicio) }
}
```

## Estrategia de pruebas y comandos

| Nivel | Qué cubre | Comando |
|---|---|---|
| Unitarias backend | Token con `lobby`, unión de intervalos, umbral, validación de políticas y del webhook | `npm test -w backend` |
| Integración (PostgreSQL real) | HU26-01, 04, 06, 09, 10, 12–15, idempotencia y permisos | `npm run test:integracion -w backend` |
| Unitarias frontend (Vitest) | Sala de espera, aplicación de políticas, expulsión, aviso | `npm test -w frontend` |
| Tipos y lint | — | `npm run typecheck`, `npm run lint -w frontend` |
| Jitsi real (manual con evidencia) | HU26-02, 03, 07, 08, 09 con dos o tres Chromium y un cliente que se salta la UI | Jitsi local en `localhost:8000` |
| Build | — | `npm run build`: **lo ejecuta el usuario** |

Cada tarea sigue rojo → verde → refactor: la prueba se escribe y se ve fallar antes de
implementar. Los criterios que dependen del servidor audiovisual no se dan por cumplidos
con simulaciones: requieren la evidencia manual anotada en `tasks/todo.md`.

## Límites

- **Siempre:** comprobar inscripción, acceso al curso y estado `retirado` en cada
  credencial; validar entradas con zod; comparar secretos en tiempo constante; no
  confiar en nombres ni eventos del navegador para permisos o asistencia; documentar.
- **Preguntar antes:** nuevas dependencias, cambios a migraciones aplicadas, abrir
  puertos o exponer el webhook fuera de la red de Docker, cambiar la versión de Jitsi.
- **Nunca:** ejecutar build ni operaciones Git de escritura (lo hace el usuario);
  versionar secretos o la distribución descargada; modificar el código de Jitsi;
  marcar asistencia por pedir una credencial; afirmar una verificación no ejecutada.

## Seguridad y datos personales

- El webhook acepta solo `POST` con el secreto propio, valida el cuerpo con zod,
  limita tamaño, no registra tokens ni correos en los logs y es idempotente.
- Ley 29733: los intervalos de conexión son datos personales con finalidad de
  asistencia; se guardan solo identificador, sala y horas. El aviso de grabación
  se registra con fecha; no se almacena audio ni vídeo.
- El token de Jitsi sigue en 300 s; el reingreso con un token anterior se contiene
  por la sala de espera obligatoria (HU26-09).

## Decisiones tomadas

El usuario pidió implementar todo sin responder las preguntas una por una; se
aplicaron las recomendaciones y quedan a su revisión:

1. Se trata `0f1aaef` como el prototipo. Si existe otro, debe registrarse en
   [licenciasTerceros.md](docs/licenciasTerceros.md) antes de integrarlo.
2. Se entregan los tres módulos; `difusion-masiva` y `sesion-ambas` quedan fuera.
   Dividir y re-estimar en Jira y Planning Poker sigue siendo tarea del equipo.
3. Duración de referencia real: `iniciadaEn` → `finalizadaEn`.
4. El expulsado no obtiene asistencia virtual de esa sesión.
5. El servidor no graba; se avisa y se registra la aceptación cuando el instructor la anuncia.
6. Sí: sesiones en cursos `VIRTUAL` y creación de reuniones por el instructor asignado.
7. Sí: vigilante que silencia, expulsa y revoca; reacción medida de 555 ms en local.

Cambios respecto del diseño propuesto: una sola migración
`0032-sesionesVirtualesSeguras.sql` (en vez de tres); `persistent_lobby` también es
necesario para la sala de espera; `api_prefix` usa una IP porque Prosody no
resuelve `/etc/hosts`.

---

# HU-36: Modalidad por sesión y cursos híbridos

Estado: **aprobada por el usuario el 16/11/2026 («realiza la implementación») e implementada en local.**
Las preguntas abiertas se resolvieron con las recomendaciones (ver «Decisiones tomadas»).
Fecha de revisión: 16/11/2026, America/Lima. Rama `SCRUM-147-hu-36-modalidad-por-sesion-y-cursos-hibridos`,
base `e79bd6c`. Esa base contiene HU-26 (`14ceac6`, `e79bd6c`), que **aún no está en `main`**:
el PR de HU-36 depende del de HU-26. Plan y seguimiento: sección HU-36 de
[tasks/plan.md](tasks/plan.md) y [tasks/todo.md](tasks/todo.md).

## Objetivo y caso de uso

Como administrador del CPPP, quiero definir si cada sesión de un curso es presencial,
virtual o ambas, y marcar un curso como grabado, para ofrecer cursos presenciales,
virtuales en vivo, grabados e híbridos (por ejemplo, cuatro días virtuales y el último
presencial). Origen: NR-03 y NR-06 de la reunión con el CPPP. Complementa HU-13.

Actores: **administrador** (programa y edita sesiones, crea cursos), **instructor**
(dicta, toma asistencia y abre la sala), **colegiado** (ve cómo y dónde asistir).

Éxito: el colegiado sabe, sesión por sesión, si va al aula, a la sala virtual o a
cualquiera de las dos; el curso se clasifica solo según sus sesiones; la asistencia se
toma por la vía que corresponde a cada sesión y cuenta igual para el certificado.

## Mapa de capacidades (Fase 0)

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `modalidad-sesion` | Modalidad por sesión, reglas de lugar, edición y modalidad del curso derivada de sus sesiones | — |
| `sala-por-sesion` | Sala virtual creada para sesiones virtuales o «ambas», acceso visible en la sesión | `modalidad-sesion`, HU-26 |
| `asistencia-por-modalidad` | QR solo donde hay aula, asistencia virtual solo donde hay sala; ambas cuentan para el 80 % | `modalidad-sesion`, HU-26 |
| `curso-grabado` | Tipo de curso grabado, sin sesiones con fecha | — |
| `lecciones-video` | Lecciones en video del curso grabado | HU-37 — **fuera de alcance** |

Orden: `modalidad-sesion` → `sala-por-sesion` y `asistencia-por-modalidad` → `curso-grabado`
(este último es independiente y puede adelantarse).

## Revisión del código actual e inconsistencias

| Hallazgo | Evidencia | Implicación |
|---|---|---|
| La modalidad solo existe en el curso | `cursos.modalidad` (`PRESENCIAL`, `VIRTUAL`, `HIBRIDA`); `classes` no tiene modalidad | Hay que añadirla a la sesión y derivar la del curso |
| La modalidad del curso la elige el administrador | Formulario y `PATCH /api/cursos/:id` | Contradice «se muestra según sus sesiones»: debe calcularse cuando hay sesiones |
| Dos vías crean sesiones | `POST /api/cursos/:id/sesiones` (detalle del curso) y `POST/PUT /api/clases` (`ClaseFormPagina`, con `cursoId`) | Ambas deben validar y guardar la modalidad y recalcular el curso |
| `lugar` es obligatorio siempre | `classes.lugar not null`; validación `"Ingresa el lugar"` | Una sesión virtual no tiene lugar físico |
| La sala virtual no se relaciona con la sesión en pantalla | Las reuniones se crean a mano en `/reuniones` con el identificador de la sesión | «Una sesión virtual muestra el acceso a la sala» no se cumple hoy |
| El QR vale para cualquier sesión | `POST /api/asistencia/marcar` y `GET /api/clases/:id/qr` no miran la modalidad | Una sesión solo virtual no debería tomar asistencia en aula |
| **Certificados solo para cursos presenciales** | `validarAlcance`: `modalidad !== 'PRESENCIAL'` → 409 `CERTIFICACION_FUERA_ALCANCE` ([docs/esp/certificados.md](docs/esp/certificados.md)) | HU-26 dice que la asistencia virtual cuenta para el 80 % del certificado, pero un curso virtual o híbrido no puede emitirlo |
| No existe HU-37 ni HU-39 | Sin código ni documentación | Lecciones en video quedan fuera; «asistencia en aula» se interpreta como el QR actual |
| No existe el curso grabado | Ningún valor ni regla | Sin sesiones el 80 % nunca se cumple: el certificado depende de HU-37 |
| Pendiente del CPPP: híbrido el mismo horario o días distintos | Nota de la historia | El modelo por sesión cubre ambos casos (sesión «ambas» o sesiones distintas); no bloquea |

## Supuestos (corregir antes de aprobar)

1. Valores de sesión: `PRESENCIAL`, `VIRTUAL`, `AMBAS`. Las sesiones existentes heredan la
   modalidad de su curso: `PRESENCIAL`→`PRESENCIAL`, `VIRTUAL`→`VIRTUAL`, `HIBRIDA`→`AMBAS`,
   así ningún curso cambia de modalidad al migrar.
2. Modalidad derivada del curso, contando solo sesiones programadas: todas presenciales →
   `PRESENCIAL`; todas virtuales → `VIRTUAL`; cualquier mezcla o alguna «ambas» → `HIBRIDA`.
   Sin sesiones programadas se conserva la modalidad planificada que eligió el administrador.
   Se guarda en `cursos.modalidad` dentro de la misma transacción para que el filtro del
   catálogo siga funcionando.
3. Con sesiones programadas, la modalidad del curso no se edita a mano: el formulario la muestra
   como calculada.
4. `GRABADO` es un nuevo valor de `cursos.modalidad`. Un curso grabado no admite sesiones
   (409) y no puede pasar a grabado si tiene sesiones programadas. Puede publicarse con sus
   módulos y materiales; las lecciones en video y su certificado esperan a HU-37.
5. Una sesión `VIRTUAL` no exige lugar (se guarda «Aula virtual»); `PRESENCIAL` y `AMBAS` sí.
6. Programar o cambiar una sesión a `VIRTUAL` o `AMBAS` crea su reunión de HU-26 con el mismo
   horario si no tiene una activa; cancelarla o pasarla a `PRESENCIAL` cancela la reunión programada.
7. El QR se rechaza en sesiones `VIRTUAL`; no se crea reunión para sesiones `PRESENCIAL`.
   En `AMBAS` vale cualquiera de las dos y cuenta una sola asistencia por sesión.
8. Los certificados se amplían a cursos `VIRTUAL` e `HIBRIDA` con la misma regla del 80 %
   (asistencia QR o virtual). `GRABADO` sigue fuera hasta HU-37.
9. No se añaden dependencias.

## Alcance

Incluye: migración, validación y API de modalidad por sesión en las dos vías; derivación de
la modalidad del curso; formularios y presentación de sesiones; reunión automática por sesión
virtual; reglas de asistencia por modalidad; ampliación del certificado; curso grabado en
creación, catálogo y filtros; mocks de la demo; documentación y pruebas.

Excluye: lecciones en video (HU-37), cambios al QR más allá de la modalidad (HU-39),
transmisión masiva y despliegue.

## Criterios de aceptación

**`modalidad-sesion`**

- **HU36-01** Dado un curso, cuando el administrador programa o edita una sesión por
  cualquiera de las dos vías, elige `PRESENCIAL`, `VIRTUAL` o `AMBAS`; otro valor → 422.
- **HU36-02** Una sesión `PRESENCIAL` o `AMBAS` sin lugar → 422; una `VIRTUAL` no lo pide.
- **HU36-03** Tras cada alta, edición o cancelación, el curso pasa a `PRESENCIAL`, `VIRTUAL`
  o `HIBRIDA` según sus sesiones programadas (supuesto 2), en la misma transacción.
- **HU36-04** Con sesiones programadas, `PATCH /api/cursos/:id` ignora o rechaza un cambio
  manual de modalidad (422 explicando que se calcula por sesiones).
- **HU36-05** En el detalle del curso, cada sesión muestra su modalidad; la presencial
  muestra lugar, fecha y horario; la virtual muestra fecha, horario y el acceso a la sala.
- **HU36-06** La migración asigna a las sesiones existentes la modalidad de su curso sin
  cambiar la modalidad de ningún curso.

**`sala-por-sesion`**

- **HU36-07** Programar o cambiar una sesión a `VIRTUAL` o `AMBAS` crea su reunión con el mismo
  horario (una sola activa por sesión); cancelarla o pasarla a `PRESENCIAL` cancela la reunión
  aún programada.
- **HU36-08** El inscrito con acceso, el instructor y el administrador ven «Entrar a la sala» en
  la sesión cuando la reunión está iniciada, y «La sala se habilita al iniciar» antes.
  Quien no está inscrito no ve el acceso; la credencial sigue protegida por HU-26.
- **HU36-09** `POST /api/reuniones` para una sesión `PRESENCIAL` → 409.

**`asistencia-por-modalidad`**

- **HU36-10** En una sesión `VIRTUAL`, `POST /api/asistencia/marcar` y el QR del instructor → 409
  `SESION_VIRTUAL`.
- **HU36-11** En una sesión `AMBAS`, el colegiado obtiene asistencia por QR en el aula o por la
  sala virtual (HU-26); queda una sola por sesión y la QR previa se conserva.
- **HU36-12** El 80 % del curso cuenta asistencias de ambas vías y permite emitir constancias en
  cursos `PRESENCIAL`, `VIRTUAL` e `HIBRIDA`.

**`curso-grabado`**

- **HU36-13** El administrador crea o edita un curso como `GRABADO` si no tiene sesiones
  programadas; programar sesiones en él → 409 `CURSO_GRABADO`.
- **HU36-14** El catálogo, el detalle, el historial y los filtros muestran «Grabado».
- **HU36-15** Un curso grabado no emite constancias hasta HU-37 (409 explicativo).

## Diseño propuesto

**Datos** (migración nueva `0033-modalidadSesion.sql`, sin tocar las aplicadas):

- `classes.modalidad varchar(10) not null default 'PRESENCIAL' check in ('PRESENCIAL','VIRTUAL','AMBAS')`,
  rellenada desde el curso (supuesto 1).
- `cursos.modalidad`: el `check` admite además `GRABADO`; se añade `"modalidadPlanificada"` con
  el valor elegido por el administrador para cuando no haya sesiones.
- Función SQL o de repositorio `recalcularModalidadCurso(cliente, cursoId)` llamada desde las
  transacciones que crean, editan o cancelan sesiones.

**API**

| Método/ruta | Cambio |
|---|---|
| POST /api/cursos/:id/sesiones, POST /api/clases, PUT /api/clases/:id | Nuevo campo `modalidad`; `lugar` según la modalidad; recalculan el curso; crean o cancelan la reunión |
| POST /api/clases/:id/cancelar | Recalcula el curso y cancela la reunión programada de la sesión |
| GET /api/cursos/:id | Cada sesión incluye `modalidad` y `reunion: { identificador, estado } \| null` (solo para quien gestiona o tiene acceso) |
| POST/PATCH /api/cursos | `modalidad` admite `GRABADO`; con sesiones, la modalidad es calculada |
| POST /api/asistencia/marcar, GET /api/clases/:id/qr | 409 `SESION_VIRTUAL` en sesiones virtuales |
| POST /api/reuniones | 409 en sesiones presenciales |

**Interfaz.** Selector de modalidad en «Programar sesión» y en el formulario de clases (el
lugar se oculta para virtual); la lista de sesiones muestra la etiqueta y el lugar o el acceso a
la sala; el formulario del curso ofrece «Grabado» y muestra la modalidad calculada; etiquetas
y filtros incluyen «Grabado»; la demo (MSW) replica las reglas.

## Pila, estructura y estilo

Igual que HU-26: Fastify + `pg` + zod en `backend/src/modules/{cursos,clases,reuniones,asistencia,certificados}`;
React + React Query en `frontend/src/paginas/{cursos,coordinador}` y `frontend/src/servicios`;
mocks en `frontend/src/mocks`. camelCase sin guiones bajos en nombres nuevos; las columnas
existentes (`curso_id`, `hora_inicio`) se conservan. Ejemplo:

```ts
export function modalidadDerivada(sesiones: ModalidadSesion[], planificada: ModalidadCurso): ModalidadCurso {
  if (sesiones.length === 0) return planificada
  if (sesiones.every(modalidad => modalidad === 'PRESENCIAL')) return 'PRESENCIAL'
  if (sesiones.every(modalidad => modalidad === 'VIRTUAL')) return 'VIRTUAL'
  return 'HIBRIDA'
}
```

## Estrategia de pruebas y comandos

| Nivel | Qué cubre | Comando |
|---|---|---|
| Unitarias backend | Derivación, validación de sesión y lugar | `npm test -w backend` |
| Integración (PostgreSQL) | HU36-01 a HU36-15, migración y transacciones | `DB_NAME=<base aislada> npm run test:integracion -w backend` |
| Frontend (Vitest) | Formularios, presentación, etiquetas y mocks | `npm test -w frontend` |
| E2E demo y real | Curso híbrido programado y visto por el colegiado | `npm run e2e`, `npm run e2e:real` |
| Tipos y lint | — | `npm run typecheck`, `npm run lint -w frontend`, `npm run e2e:tipos` |
| Build | — | `npm run build`: **lo ejecuta el usuario** |

Cada tarea: prueba en rojo, implementación mínima, suite del workspace, tipos y evidencia.

## Límites

- **Siempre:** validar en el backend (no solo en la interfaz); recalcular en la misma transacción;
  mantener la demo alineada; conservar la compatibilidad de datos existentes.
- **Preguntar antes:** dependencias nuevas, cambios en migraciones aplicadas, cambiar reglas
  de certificación más allá del supuesto 8.
- **Nunca:** build ni operaciones Git de escritura (las hace el usuario); inventar lecciones en
  video; afirmar verificaciones no ejecutadas.

## Decisiones tomadas y ajustes de diseño

Se aplicaron las ocho recomendaciones: modalidad planificada sin sesiones; modalidad
calculada (no editable a mano) con sesiones; sala automática para «virtual» y «ambas»;
QR rechazado en virtuales y sala rechazada en presenciales; constancias en cursos
virtuales e híbridos; «Grabado» como modalidad que puede publicarse sin certificado;
no esperar la confirmación del CPPP; integrar HU-26 antes que HU-36.

Ajustes descubiertos al implementar:

- `modalidad` es **opcional** en la API por compatibilidad: `PRESENCIAL` al crear y la actual
  al editar. La interfaz siempre la envía (ajusta HU36-01).
- El backend **no tiene** `PUT /api/cursos/:id` (ruta pendiente): la modalidad planificada se fija
  al crear. HU36-04 se cumple en la interfaz (campo calculado) y en la demo (422 `MODALIDAD_CALCULADA`).
- `"modalidadPlanificada"` se completa con un trigger para las inserciones antiguas (semillas y scripts).
- La migración marca «ambas» las sesiones con una sala activa; la semilla demo declara esas clases como «ambas».
- Inconsistencia previa, **no corregida**: `ClaseFormPagina` envía `cursoId` a `POST /api/clases`, que lo
  ignora, así que la clase queda sin curso en el backend real. Se dejó igual para no cambiar el
  instructor asignado ni romper PRG-10; queda pendiente.

## Preguntas abiertas (resueltas, se conservan como registro)

1. Sin sesiones, ¿el curso muestra la modalidad planificada (recomendado) o «Por definir»?
2. ¿Bloquear la edición manual de la modalidad cuando hay sesiones (recomendado: sí, calculada)?
3. ¿Crear automáticamente la sala de HU-26 al programar una sesión virtual o «ambas» (recomendado: sí)?
4. ¿Rechazar el QR en sesiones solo virtuales y la sala en sesiones presenciales (recomendado: sí)?
5. **Certificados**: ¿se emiten constancias en cursos virtuales e híbridos con el mismo 80 %?
   Hoy solo en presenciales (regla HU-20). Recomendado: sí, confirmándolo con el CPPP.
6. ¿«Grabado» como valor de modalidad del curso (recomendado) o como marca aparte? ¿Se permite
   publicarlo antes de HU-37 (recomendado: sí, sin certificado)?
7. ¿Esperar la confirmación del CPPP sobre el híbrido? El diseño cubre el mismo horario
   (sesión «ambas») y días distintos (sesiones separadas), así que no bloquea.
8. El PR de HU-36 depende de HU-26: ¿se integra primero HU-26 en `main` (recomendado)?

# HU-40 · Compartir un curso por WhatsApp con enlace corto

**SCRUM-151 · Aprobada para implementación · 17/11/2026**

## Objetivo y caso de uso

Un administrador del CPPP comparte un curso publicado y elige el destinatario en
WhatsApp. El profesor recibe un enlace corto con una vista previa y puede consultar
la ficha pública antes de iniciar sesión. Desde «Inscribirme» conserva el curso
seleccionado y confirma la inscripción mediante el flujo existente de HU-22.

La historia se basa en NR-01 y NR-20 según el enunciado recibido e incorpora el
criterio del 10/11 sobre «Compartir» en tarjetas y fichas. SIFODS se toma como
referencia para la ubicación de la acción junto al curso. El plan divide este mismo
recorrido en entregas verificables.

## Punto de partida e inconsistencias

| Hallazgo | Consecuencia para HU-40 |
| --- | --- |
| En `frontend/src/rutas.tsx`, `/` y `/capacitaciones` son públicos, y `/cursos/:id` requiere sesión. El catálogo anónimo enlaza al acceso con el curso seleccionado. | El enlace compartido necesita una ficha anónima propia. El detalle privado y su retorno tras iniciar sesión ya tienen un contrato probado. |
| `GET /api/publico/cursos` lista publicados vigentes según la fecha de Lima. El catálogo autenticado incluye todos los publicados. `GET /api/cursos/:id` es privado y ofrece datos sujetos a permisos. | La ficha y la vista previa necesitan una consulta por ID con campos públicos explícitos. La vigencia del catálogo, la visibilidad del enlace y los cupos de inscripción son condiciones distintas. |
| Antes de HU-40, el servidor frontend servía el mismo `index.html` para las rutas de React, con un título y una descripción generales. | Los rastreadores necesitan metadatos específicos en el primer HTML de la URL corta. |
| El modelo de cursos carece de imagen de portada. Ya existe una insignia del CPPP. | La vista previa de todos los cursos usa una imagen institucional horizontal. |
| La cifra `costo` puede corresponder al curso o solo a la constancia. El catálogo ya muestra esa distinción. | La ficha y la vista previa deben expresar qué se cobra para evitar anunciar como pagada una capacitación gratuita. |

## Decisiones de implementación

- Enlace estable `https://<origen público>/c/<id>`, con el identificador decimal
  existente de 1 a 15 dígitos y sin cero inicial. El título puede cambiar sin
  invalidar el enlace. El origen oficial de producción se confirma antes de
  publicar. `VITE_ORIGEN_PUBLICO` configura el mismo origen para el cliente y
  Express. El desarrollo local puede usar HTTP en loopback.
- «Compartir» aparece en tarjetas de los catálogos público y autenticado, en las
  tarjetas de «Mis cursos» de gestión y en los detalles público y privado de cursos
  publicados. Ofrece «Compartir por WhatsApp» y «Copiar enlace». Al copiar se
  comunica el resultado y el enlace sigue disponible para selección manual.
- Un curso publicado sin cupos o con fecha de fin pasada conserva su ficha y se
  puede compartir. La ficha muestra «Sin cupos» o «Curso finalizado» en lugar de
  ofrecer inscripción. La comparación de fechas usa el día de Lima. Los publicados
  sin fechas conservan «Fechas por confirmar» y ofrecen inscripción si tienen cupos.
- Se usa una imagen institucional de capacitaciones basada en la insignia del CPPP.
  La ficha y la vista previa muestran un rango si se conocen ambas fechas y
  son distintas, una sola fecha si coinciden, «Inicio» o «Fin» si solo se conoce
  ese extremo, y «Fechas por confirmar» si se desconocen ambas.
  El costo distingue «Gratuito», «Curso: S/ …» y «Curso gratuito · Constancia: S/ …».
  Cuando el cobro histórico está pendiente de configuración, se indica esa condición.
- La ficha usa «Inscribirme» para seleccionar el curso. Para visitantes enlaza al
  acceso con `curso=<id>`, que también permite crear cuenta y recuperar la selección.
  Para un participante con sesión enlaza directamente al detalle privado. La
  inscripción y el cobro se confirman en el flujo de HU-22 y HU-53. Los demás roles
  pueden ver y compartir la ficha, y conservan sus permisos de inscripción.

## Contratos HTTP

| Entrada | Resultado |
| --- | --- |
| `GET /api/publico/cursos/:id` | `200` con los campos de `CursoPublico` usados por la ficha más `vigente`, calculado en el servidor. La consulta solo considera cursos publicados y conserva una lista explícita de campos. `404` con el mismo error para ID inválido, inexistente, borrador o cerrado. `Cache-Control: no-store`. |
| `GET /c/:id` | `200` con la aplicación y las etiquetas Open Graph en el `head` del HTML inicial. `og:url` identifica la URL corta, `og:title` contiene el nombre, `og:description` incluye fecha y costo, y `og:image` apunta a una imagen pública absoluta con texto alternativo. Mismo resultado para visitantes y rastreadores. |
| `GET /c/:id` sin publicación visible | `404` con una pantalla que permite volver al catálogo y sin metadatos del curso. Si el backend no está disponible, se muestra un error recuperable con estado `502` y sin metadatos engañosos. |
| `GET /c/:id` sin origen configurado en Express | `503` sin metadatos de curso. Las demás rutas siguen disponibles. |
| Acción de WhatsApp | `https://wa.me/?text=…` con título y URL corta codificados en un único mensaje. WhatsApp permite elegir el contacto o grupo y confirmar el envío. |

La consulta del servidor frontend usa un backend configurado, un ID validado
y un tiempo de espera acotado. Genera enlaces absolutos a partir de un origen
configurado y validado. En producción ese origen es HTTPS. El HTML codifica los
valores interpolados y los estados de error se comunican sin exponer información
interna. El recurso público excluye IDs de personas, inscritos, materiales,
sesiones privadas, reuniones, pagos y credenciales. Conserva el nombre profesional
ya público del instructor.

## Criterios de aceptación

| ID | Criterio verificable |
| --- | --- |
| HU40-01 | Desde la ficha o tarjeta de un publicado, un administrador puede pulsar «Compartir» y «Compartir por WhatsApp». La URL de WhatsApp lleva como texto el título correcto y el enlace corto del mismo curso, incluso con tildes y signos. |
| HU40-02 | Una petición HTTP anónima al enlace HTTPS recibe un `200` y, antes de ejecutar JavaScript, contiene título, fecha, costo e imagen pública. Se verifica la vista previa al pegar el enlace en WhatsApp y Facebook desde un entorno público. |
| HU40-03 | Un profesor sin sesión abre el enlace, ve el título, los datos públicos y «Inscribirme» si el curso está vigente y tiene cupos. Al iniciar sesión o registrarse vuelve al detalle del mismo curso. La visita y el acceso por sí solos dejan la inscripción sin crear. |
| HU40-04 | Cada tarjeta de catálogo y cada detalle de un publicado muestra «Compartir» como acción independiente del título y de «Inscribirme». Funciona con teclado y en un ancho de 320 px. «Copiar enlace» entrega la misma URL de WhatsApp y permite copiarla manualmente si falla el portapapeles. |
| HU40-05 | Publicados sin cupos o vencidos conservan el enlace con el estado correspondiente y sin acción de inscripción en la ficha pública. Los ID inválidos, inexistentes, borradores y cerrados reciben `404` sin contenido del curso. El detalle protegido sigue exigiendo sesión. |
| HU40-06 | Los casos con fecha única, rango o fechas por confirmar y con cobro previo, constancia pagada o gratuidad reflejan los datos del curso. La ficha y el HTML inicial usan las mismas condiciones públicas. |

## Pila, estructura y estilo

- Fastify 5 y PostgreSQL para la consulta y la matriz de permisos en
  `backend/src/modules/cursos/` y `backend/src/plugins/permisos.ts`.
- React 19, React Router 7 y Vite en `frontend/src/rutas.tsx`,
  `frontend/src/paginas/cursos/`, `frontend/src/servicios/cursos.ts` y
  `frontend/src/mocks/cursos.ts`. Express 5 sirve el HTML de producción desde
  `frontend/servidor.js`. Los recursos públicos se sirven desde `frontend/public/`.
- Integración Node en `backend/test/integracion/`, pruebas de Express en
  `frontend/test/servidor.prueba.js`, unidades Vitest junto al código y recorridos
  Playwright en `e2e/prb/demo/` y `e2e/prb/real/`.
- Nombres en `camelCase` para funciones y variables, `PascalCase` para tipos y
  componentes y archivos sin guiones bajos. El helper existente
  `accesoConCurso('/login', curso.id)` ejemplifica cómo se reutiliza la selección.
  Se conservan los nombres de contratos externos y columnas históricas.

## Pruebas y comandos

| Comprobación | Comando o evidencia |
| --- | --- |
| Línea base del servidor web | `npm run test:servidor -w frontend`. 3 aprobadas antes de implementar. |
| API de cursos | `npm exec -w backend -- node --import tsx --test --test-concurrency=1 test/integracion/catalogo.test.ts`, con PostgreSQL y Redis aislados de prueba. |
| Servidor web y unidades | `npm run test:servidor -w frontend` y `npm test`. |
| Recorridos y regresión de HU-22 | `npm run e2e -- e2e/prb/demo/catalogoPublico.spec.ts` y `npm run e2e:real -- e2e/prb/real/catalogoPublico.spec.ts`. Ambos archivos incluyen los nuevos recorridos HU-40. |
| Tipos y lint | `npm run typecheck`, `npm run e2e:tipos` y `npm run lint -w frontend`. |
| Desarrollo y build de entrega | `npm run dev` o `npm run dev:demo`. `npm run build` corresponde al usuario al verificar el código. |
| Vista previa real | GET e imagen accesible por HTTPS, Facebook Sharing Debugger y pegado real de la URL en WhatsApp y Facebook. Los clientes controlan el recorte de texto y su caché. |

## Límites y publicación

- Siempre validar visibilidad e ID en servidor, parametrizar consultas, codificar
  el HTML y verificar regresiones de HU-22, permisos y cobro.
- Consultar antes de ampliar el alcance a portadas editables, un acortador
  externo, una migración o cambios de infraestructura más allá de configurar el
  origen y servir la ruta en el despliegue existente.
- Las operaciones Git, el build y la publicación son manuales según
  `AGENTS.md`. No se envían mensajes ni se publica durante esta tarea.
- El origen HTTPS definitivo y la comprobación de vista previa con los clientes
  reales quedan pendientes de publicación. El
  [plan HU-40](tasks/plan.md#hu-40--plan-de-implementación) detalla las condiciones.

## Referencias

- Formato oficial de enlace con mensaje precargado. [Ayuda de WhatsApp](https://faq.whatsapp.com/5913398998672934)
- Metadatos en el HTML, URL canónica y vista previa. [Open Graph](https://ogp.me/), [Meta para webmasters](https://developers.facebook.com/documentation/sharing/webmasters)

# HU-29 · Notificaciones por correo

## Objetivo

Como colegiado, quiero recibir un aviso cuando se confirme mi inscripción,
se resuelva mi pago, cambie una sesión de mi curso o se emita mi certificado.
Como administrador, quiero saber si se intentó el envío, si se reintentará
y qué error requiere atención. La historia desarrolla RF-36 y las cinco
plantillas de SCRUM-211. [Diseño de los correos](docs/correos/README.md)

## Punto de partida

| Lo que existe | Lo que falta para HU-29 |
| --- | --- |
| HU-32 encola comprobantes y rechazos de transferencias en `notificacionesPago`. El worker SMTP registra intentos y conserva adjuntos PDF en aprobaciones. La ficha de pago muestra el estado de su propio correo. | Usar las plantillas CPPP y enlaces protegidos en los avisos reales. Unificar el seguimiento administrativo y evitar un segundo correo de aprobación para la misma operación. |
| `pagos.correo.ts` reclama envíos con bloqueo y conserva un `Message-ID` estable. Cualquier excepción vuelve a dejar el envío pendiente, incluso un corte al esperar la respuesta final. | Separar los fallos que permiten reintento de los resultados inciertos. Conservar los estados y contratos históricos durante la transición. |
| `inscribirseEnCurso` confirma el alta sin cobro previo. Para una reserva con pago previo, el trigger `pagoConfirmaReserva` activa el acceso solo si la reserva sigue vigente. | Encolar al confirmar el acceso. Un ingreso tardío en conciliación puede tener comprobante de recepción, pero la inscripción sigue sin confirmarse. |
| La edición y la cancelación de clases de un curso pasan por transacciones que recalculan modalidad y sincronizan la sala. | Detectar cambios reales de la sesión dentro de la transacción y avisar a sus inscritos confirmados. |
| `emitir` guarda el documento. `liberarRetenidas` también usa ese camino cuando se confirma el pago. Una corrección genera su propio reemplazo por otra vía. | Avisar al emitir el documento disponible, como parte de la misma transacción. |
| Izipay verifica cobros exitosos. La ruta de rechazo de transferencia persiste `RECHAZADO` y un flujo legado de Culqi puede registrar un rechazo explícito. | Cubrir rechazos definitivos acreditados. Validar el contrato de Izipay para identificar un rechazo terminal sin confundirlo con una respuesta incompleta o una incidencia. |

## Comportamiento propuesto

| Evento | Destinatario, condición y enlace |
| --- | --- |
| Inscripción confirmada | Titular del intento que adquiere acceso al curso. Incluye gratuidad, cobro al emitir constancia y reserva pagada a tiempo. Enlace al detalle del curso. |
| Pago aprobado | Titular de la obligación. El comprobante de HU-32 es el aviso de aprobación e incluye su PDF vigente. Para un ingreso tardío o en conciliación, el aviso de recepción explica el estado y evita afirmar que el acceso está confirmado. Enlace al estado del pago en el curso. |
| Pago rechazado | Titular de la operación cuya revisión o pasarela acredita el rechazo definitivo. Cada nueva operación se considera por su ID. Enlace a consultar el pago o retomarlo si la acción sigue disponible. |
| Sesión modificada o cancelada | Participantes activos con inscripción confirmada a quienes afecta la sesión del curso. Avisar por cambio de fecha, hora, lugar, modalidad, nombre o cancelación. Conservar los valores anteriores y nuevos que correspondan. Enlace a las sesiones del curso. |
| Emisión de constancia o certificado | Titular del documento disponible al cerrar el curso, por excepción o al liberar la retención tras el pago. Enlace a su historial autenticado, donde puede abrir el documento. |

- Un cambio de sesión con los mismos valores, una edición rechazada, un ajuste
  de controles de sala, una inscripción pendiente y un documento retenido
  carecen de evento de correo. Las clases independientes, reemisiones por
  corrección, anulaciones, recordatorios y envíos históricos masivos quedan
  fuera de esta propuesta.
- La unidad de deduplicación es el evento persistido y su destinatario. Una
  aprobación que confirma una inscripción produce el comprobante de pago y el
  aviso de inscripción, uno por cada hecho. Se conserva un identificador de
  correo estable en cada reintento.
- Se propone usar enlaces HTTPS de un origen de aplicación configurado y
  destinos internos permitidos. Tras iniciar sesión se recupera el destino.
  El servidor conserva el control de acceso al recurso. Los enlaces carecen
  de credenciales y tokens de sesión y pueden abrirse más de una vez.

## Criterios de aceptación

| ID | Resultado verificable |
| --- | --- |
| HU29-01 | Cuando se completa cualquiera de los cinco eventos con una cuenta activa y un correo válido, queda un registro por destinatario, persistido en la misma transacción que el evento. Repetir la solicitud, recalcular el mismo estado o revertir la transacción no duplica ni genera un aviso indebido. |
| HU29-02 | Las cinco plantillas producen asunto, HTML y texto con los campos del evento y un enlace al recurso. Un visitante llega al destino previsto tras acceder y otra cuenta carece de acceso a los datos privados. Se prueban caracteres especiales y URL hostiles como entradas rechazadas o escapadas. |
| HU29-03 | Cuando un servidor SMTP acepta el mensaje, se guarda la fecha de aceptación. Dos trabajadores concurrentes no entregan dos veces el mismo aviso. El resultado describe la aceptación SMTP. La llegada a la bandeja no se mide en esta historia. |
| HU29-04 | Un fallo temporal con entrega descartada se reintenta hasta cinco intentos totales, con esperas propuestas de 1, 5, 15 y 60 minutos. Un rechazo SMTP permanente o un correo inválido termina con un código revisable. Un corte después de la fase de envío o un intento abandonado cuya aceptación no pueda descartarse se registra como incierto, pendiente de conciliación con el proveedor antes de volver a enviar. |
| HU29-05 | Un administrador autenticado puede consultar una lista paginada, filtrar por tipo y estado y ver intentos, próximo intento o fecha de aceptación y una causa legible. El acceso anónimo devuelve 401 y los demás roles reciben 403. La lista omite el cuerpo y los detalles SMTP sin filtrar. |
| HU29-06 | Un aviso a una cuenta inactiva o con un correo que ya no coincide se registra como omitido sin transferir el mensaje a otra dirección. La confirmación del negocio conserva su resultado. La configuración local y CI usan exclusivamente buzones sintéticos. |
| HU29-07 | Se conserva el historial de correos de pago y el comprobante de HU-32 durante el cambio de worker. Los registros existentes se pueden consultar sin volver a enviar avisos que ya se aceptaron. Apagar el envío conserva los registros y reintentos por procesar. |

SMTP puede aceptar el contenido antes de perderse su respuesta final. Para
aplicar el requisito de un solo mensaje proponemos reconciliar ese caso con el
proveedor antes de reintentar. La aceptación normal y la pérdida de respuesta
se verifican con un servidor SMTP de prueba. [RFC 5321, sección 6.1](https://www.rfc-editor.org/rfc/rfc5321.html#section-6.1)

## Estructura, convenciones y verificación

- Fastify y TypeScript para emisión e inspección. PostgreSQL para persistencia,
  exclusión entre trabajadores y estado de entrega. Reutilizar Nodemailer y el
  planificador de procesos existente. React para la vista de administración.
- Los productores viven con inscripción, pagos, sesiones y certificados. La
  lógica de correo se concentra en `backend/src/modules`. Las pruebas siguen
  la estructura actual de `backend/test`, `backend/test/integracion` y `e2e`.
- Mantener las convenciones de `AGENTS.md` y nombres ya utilizados, como
  `enviarNotificacionesPago` y `ultimoError`. Usar consultas parametrizadas,
  opciones de enlace de lista cerrada, HTML escapado y un remitente fijo.
- Ejecutar `npm test`, `npm run typecheck`, `npm run e2e:tipos`,
  `npm run lint -w frontend` y, con PostgreSQL y Redis aislados,
  `NODE_ENV=test npm run test:integracion`. El plan precisa las pruebas
  enfocadas de SMTP, permisos y navegador. `npm run build` se ejecuta
  manualmente en la fase de entrega.

## Límites y decisiones para aprobación

- Verificar identidad y propiedad al abrir el destino. Excluir DNI, voucher,
  cuentas bancarias, datos de tarjeta y respuestas crudas del proveedor del
  cuerpo nuevo, del panel y de los logs. Mantener el comprobante de pago y
  revisar sus campos por separado dentro de HU-32.
- La aprobación del plan incluye la propuesta de migraciones aditivas y una
  vista de administración en el sistema. El diseño utiliza el SMTP existente.
  Cualquier proveedor nuevo, enlaces de acceso sin sesión o cambio de
  infraestructura requieren una decisión de alcance.
- Confirmar con el equipo si se aceptan dos avisos para un pago que también
  confirma la inscripción y si basta un enlace HTTPS con autenticación y
  autorización en destino. Estas son las opciones propuestas para el desarrollo.
- Para la activación se necesita origen HTTPS, remitente y SMTP institucional,
  acceso de operaciones al registro del proveedor para casos inciertos y una
  política de retención de destinatarios y contenidos. Propuesta para aprobar
  antes de iniciar el envío real: 90 días para datos operativos de correo,
  con conservación de la auditoría financiera según su propia política.
- Guardar las credenciales en la configuración del entorno. La compilación y
  las operaciones Git son manuales según `AGENTS.md`. La implementación
  espera aprobación humana. La publicación queda fuera de esta tarea.

# T-24 · Referencias de diseño para cursos grabados

## Objetivo

Traducir el encargo NR-21 del CPPP en una referencia que el equipo pueda
incorporar al Figma institucional. La entrega documenta cinco patrones de
SIFODS y PerúEduca y los vincula con HU-17, HU-37, HU-38 y HU-44.

## Punto de partida

| Hallazgo | Consecuencia para el diseño |
| --- | --- |
| HU-36 permite publicar un curso `GRABADO` con módulos y materiales. El backend excluye sesiones con fecha y todavía bloquea su emisión de constancias. | Diseñar un aula de lecciones y estados de aprendizaje. El recorrido grabado necesita sus propias reglas de elegibilidad. [HU-36](#hu-36-modalidad-por-sesión-y-cursos-híbridos) |
| La ficha del curso ya presenta módulos y el servidor controla el acceso al contenido. «Mis cursos» y «Historial» ya son recorridos del agremiado. | Usarlos como puntos de entrada y salida del aula. Mostrar avance de aprendizaje por separado de asistencia, nota y pago. [Pantallas de Figma](docs/esp/pantallas-figma.md#7-historial-41--51--scrum-142-scrum-176) |
| Las referencias muestran tanto cuestionarios por módulo como evaluaciones de salida. Las reglas dependen de cada oferta formativa. | Diseñar el componente de evaluación dentro del módulo. Dejar nota mínima, intentos, desbloqueo y condiciones de constancia a las historias y al CPPP. |
| El nodo institucional de Figma `4:52` contiene el sistema de diseño. El archivo tiene fichas del curso e historial en escritorio y celular. Las fichas oficiales de Jira y las pautas del CPPP siguen sin fuente disponible. | Registrar las cinco anotaciones en un marco editable de «Escritorio» y enlazar las pantallas existentes. Conservar la trazabilidad local mientras falten las fichas de Jira. [Marco T‑24 en Figma](https://www.figma.com/design/ORSusbg35vcu0nUEz4o08q/GestionCapa?node-id=262-2950) |

## Criterios de aceptación

| ID | Resultado verificable |
| --- | --- |
| T24-01 | El resumen cubre ingreso, estructura en módulos, barra de avance, evaluación por módulo y constancia descargable. Cada patrón identifica la evidencia oficial y distingue el caso observado de la decisión de diseño. |
| T24-02 | Los cinco patrones incluyen una anotación para Figma, estados principales y un enlace a su historia de referencia. Las cuatro historias pedidas aparecen en la trazabilidad. Cada asignación sin ficha oficial se identifica como propuesta. |
| T24-03 | El documento registra las pautas entregadas por el CPPP con su fuente. Si el colegio aún no las ha entregado, queda indicado qué decisiones podrían cambiar. |
| T24-04 | La referencia es localizable desde la documentación del Figma y deja constancia del acceso disponible. El recorrido conserva identidad institucional y permisos de contenido y descarga. |

## Entregable y verificación

- El informe vive en [Referencia de cursos grabados](docs/esp/referenciaCursosGrabados.md).
  El [plan](tasks/plan.md#t-24--plan-del-referente-de-diseño) y el
  [seguimiento](tasks/todo.md#t-24--seguimiento) conservan las tareas y resultados.
- Consultar fuentes públicas del Minedu y el código en modo de lectura.
  Parafrasear las observaciones, citar guías y cursos concretos y usar historias
  y patrones con anclas comprobables. Verificar el diff con `git diff --check`
  y comprobar cobertura y enlaces relativos. El entregable es documental.
- Aplicar la identidad existente del CPPP y describir estados con texto. Las
  credenciales, capturas con datos personales, umbrales académicos externos,
  integración con las plataformas y cambios de aplicación quedan fuera de T-24.

## Ampliación aprobada · Prototipo en GestionCapa

El prototipo traslada los cinco patrones al modo demo existente, con un curso
grabado, gratuito y de programa fijo, con el ingreso e inscripción de la aplicación. La
experiencia requiere una sesión y una inscripción confirmada. El servidor
simulado mantiene el avance del agremiado en el navegador para retomar el curso
tras recargar. Cada módulo contiene una lección y una evaluación corta. Una
respuesta incorrecta admite otro intento y conserva el avance anterior. Cada
actividad completada habilita la siguiente. Al completar los módulos se puede
descargar un PDF de demostración sin validez oficial.

Se verifica el recorrido con un curso de prueba, progreso por cuenta y estados
bloqueado, en progreso y completado. El prototipo se habilita con `npm run dev:demo`.
Las reglas académicas definitivas, el almacenamiento real y la emisión
institucional corresponden a las historias de implementación.

# HU-51 · Imagen de portada del curso en el catálogo

**SCRUM-177 · Aprobada e implementada · 18/11/2026**

## Objetivo y caso de uso

El administrador selecciona una portada opcional al crear un curso y puede
cambiarla o quitarla en la pantalla de edición. Cuando el curso se publica, el
colegiado reconoce su tema en la tarjeta, abre el detalle al pulsarla y ve la
misma portada en grande. Quien recibe el enlace por WhatsApp puede reconocer el
curso desde la vista previa. Los cursos existentes sin imagen usan la
ilustración de su categoría.

El recorrido reutiliza la interfaz del Sprint 3, producto de la retrospectiva
del Sprint 2 y de las referencias de PerúEduca y SIFODS. La cobertura alcanza
el catálogo con sesión, el anónimo y sus detalles. Aplican las reglas vigentes
de visibilidad, inscripción, cupos y precio del CPPP.

## Código actual e inconsistencias

| Evidencia en la rama | Consecuencia para HU-51 |
| --- | --- |
| `CampoPortada` y `reglasCurso.ts` ofrecen selector, arrastre y previsualización. Una imagen fuera de proporción recibe el mensaje «se recortará a 16:9», pero el formulario envía el original. MSW solo valida tipo declarado y una estimación de bytes. | Acordar la regla de proporción y verificar contenido, dimensiones y bytes en el backend real. |
| `frontend/src/servicios/cursos.ts` y MSW exponen `portadaUrl`, carga y retiro. El backend y las migraciones carecen de almacenamiento, endpoints y proyección de portada. | Completar la persistencia, incorporar URLs al contrato y mantener el reemplazo por categoría para datos anteriores. |
| `CursoFormPagina.tsx` guarda los datos antes de subir el archivo. Un fallo posterior a crear el borrador deja un curso guardado y puede producir otro al reintentar. La edición llama primero a `PUT /api/cursos/:id`, disponible en demo. | Integrar la portada en la creación transaccional y permitir guardar la portada de un curso existente desde el campo de edición con su endpoint propio. |
| `TarjetaCatalogo` enlaza casi toda la superficie mediante un enlace expandido y preserva «Compartir». Tiene hover y foco, pero carece de estado de pulsación explícito. La modalidad se superpone a la imagen. | Conservar el enlace y el control independiente, añadir respuesta al toque y ubicar la modalidad en el cuerpo bajo la imagen. |
| Los detalles público y autenticado ya usan `PortadaCurso`. La imagen subida tiene el título como texto alternativo. Las ilustraciones por categoría son decorativas en el marcado y la portada subida carece de tamaños responsivos. | Reutilizar el componente con nombre accesible, espacio reservado y fuentes adecuadas a tarjeta y detalle. |
| La rama tiene ficha React en `/capacitaciones/:id` y una vista simulada en el modal. En el backend real faltan la ficha individual y la ruta de compartir. El revert `86082a5` retiró el HTML Open Graph de HU-40 y el Express actual sirve el mismo índice en todas las rutas React. | Recuperar la parte de HU-40 que necesita la portada. Mantener el enlace corto `/c/:id` y compatibilidad con la ruta pública que ya usa la interfaz. |

## Decisiones propuestas

- Se aceptan imágenes estáticas JPEG, PNG y WebP con hasta **1 048 576
  bytes** de archivo decodificado, inclusive, y proporción exacta **16:9**
  después de aplicar la orientación de la foto. El formulario explica cómo
  preparar otra imagen si la proporción no coincide. Se propone un límite de
  **16 megapíxeles** para acotar memoria al decodificar.
- PostgreSQL conserva una portada vigente por curso, con los binarios
  derivados y su versión. Se propone Sharp para validar y volver a codificar
  la imagen, aplicar orientación y retirar metadatos. Las variantes propuestas
  son WebP de hasta **352 × 198** y **704 × 396** para tarjetas, y JPEG de
  **1280 × 720** para detalle y vista social. Se evita ampliar las variantes
  de tarjeta y se usa su ancho real en el marcado. En JPEG, la transparencia
  se compone sobre el fondo institucional.
- Crear un curso con portada guarda ambos en una transacción. En edición, el
  campo de portada permite guardar o quitar la imagen por separado. Un fallo
  conserva la última portada confirmada. Repetir la misma carga o quitar de
  nuevo la portada deja el mismo estado. La publicación usa el flujo existente.
- Una portada publicada se sirve en una URL del mismo sitio con una versión
  que cambia cuando cambia el contenido. El servidor comprueba el estado del
  curso y la versión vigente en cada solicitud. Los borradores y cerrados
  quedan fuera de la consulta pública. Para esos estados, la vista previa
  interna usa el cliente autenticado de la aplicación, con los mismos permisos
  del detalle y sin poner credenciales en la URL.
- La ilustración de respaldo usa la asignación de categorías del Sprint 3,
  incluida Tecnología/Tecnología educativa, y la variante General para
  categorías históricas sin asignación. La web y Open Graph comparten esa
  asignación. Para Open Graph se sirve una variante raster del mismo diseño
  por una URL pública HTTPS.
- Se mantiene el comportamiento de HU-40 para links de cursos publicados con
  fecha pasada o sin cupos. Su ficha puede consultarse y sigue indicando su
  estado. El catálogo público conserva su filtro de vigencia en Lima.

## Contratos propuestos

| Entrada | Comportamiento |
| --- | --- |
| `POST /api/cursos` | Acepta `portada` opcional con `{ nombre, tipo, contenidoBase64 }`. Un archivo inválido devuelve `422` con `fields.portada` y deja la base sin un borrador nuevo. La creación sin portada conserva su respuesta y comportamiento. |
| `PUT` y `DELETE /api/cursos/:id/portada` | Solo ADMIN. `200 { portadaUrl }` al guardar y `204` al quitar. Formato, proporción o contenido inválidos devuelven `422 VALIDACION`. El archivo mayor al límite devuelve `422 PORTADA_MUY_PESADA`. Si la petición completa rebasa el límite de transporte, devuelve `413`. Se acota el JSON por ruta por encima del tamaño de 1 MiB en base64 más los demás campos permitidos. |
| `GET /api/cursos/:id/portada` | Lectura autenticada con la autorización del curso para la vista interna. Si la portada está ausente, responde `404`. La respuesta interna usa `private, no-store`. |
| `GET /api/publico/cursos/:id/portada/:version/:variante` | Imagen sin sesión solo para la versión vigente de un curso `PUBLICADO`. Variantes cerradas `miniatura`, `tarjeta` y `grande`; tipo real WebP o JPEG, `nosniff` y revalidación antes de reutilizar caché. Estados, versiones o variantes no visibles devuelven `404`. |
| Consultas de catálogo y detalle | Añaden `portadaUrl` y, cuando corresponda, `portadaFuentes` con URL y ancho real para las tarjetas. `null` en la URL indica respaldo por categoría. Las respuestas JSON conservan sus campos y solo incluyen enlaces, sin binarios ni metadatos del original. |
| `GET /api/publico/cursos/:id` y `GET /api/publico/cursos/:id/compartir` | Devuelven una ficha o enlace estable con datos públicos permitidos, incluso si el publicado quedó fuera del listado por fecha. La ficha conserva el retorno de HU-22 y las condiciones vigentes de inscripción. El recurso de compartir devuelve `url`, `enlaceCorto` y los datos de vista previa, a partir del origen público configurado. Un curso inexistente, borrador o cerrado devuelve `404`. |
| `GET /c/:id` y `GET /capacitaciones/:id` en Express | Entregan la ficha React. El HTML inicial incluye `og:type`, `og:title`, `og:url`, `og:description`, `og:image` absoluta, tipo de imagen, dimensiones y `og:image:alt`. Los metadatos se obtienen del backend configurado, sin sesión y con tiempo de espera acotado. Un curso no visible devuelve `404`, una falla de backend `502` y una configuración pública incompleta `503`. Esas respuestas carecen de metadatos del curso. |

La URL pública se construye desde el origen del catálogo configurado en el
servidor. Se propone reutilizar `FRONTEND_URL` si corresponde al catálogo y
configurar un origen público explícito si el subdominio difiere. Solo se admite
HTTPS en producción. El host enviado por el visitante y el nombre del archivo
quedan fuera de la construcción de URLs. Se registran el resultado y el ID del
curso para cambios de portada, siguiendo el registro de operaciones del
proyecto y sin guardar el archivo, su base64 ni credenciales en los logs.

## Criterios de aceptación

| ID | Criterio verificable |
| --- | --- |
| HU51-01 | Un administrador puede seleccionar y previsualizar JPG, PNG o WebP 16:9 válido de hasta 1 MiB al crear un borrador, y cambiarlo o quitarlo al editar un curso visible para administración. La selección se conserva al recargar tras guardar. El límite se verifica con archivos válidos de 1 048 576 y 1 048 577 bytes. El servidor rechaza discrepancias de formato, archivos corruptos y proporciones inválidas. |
| HU51-02 | La tarjeta de un curso publicado muestra la portada arriba y el título, modalidad, fechas, horas, costo y cupos debajo. Mantiene el formato de gratuidad o de pago por constancia y el estado «Sin cupos» donde corresponde. Se prueba en ambos catálogos. |
| HU51-03 | Pulsar la imagen, el título o el cuerpo abre el detalle del mismo curso. Hover, pulsación táctil y foco visible resaltan la tarjeta. Un enlace semántico permite abrirla con Enter; el botón «Compartir» abre su propio diálogo. |
| HU51-04 | El detalle público y el autenticado muestran la portada en grande. Al cambiarla, el catálogo y el detalle muestran la nueva versión tras actualizar los datos. |
| HU51-05 | Un curso antiguo, uno nuevo sin archivo o uno al que se le quitó la portada muestran la ilustración de su categoría. Dos categorías asignadas a diseños distintos se distinguen y una categoría desconocida usa General. Un fallo al cargar la imagen pasa al mismo respaldo. |
| HU51-06 | La portada propia y la de respaldo tienen el título como nombre accesible. A 360 px, una tarjeta descarga una fuente de hasta 352 px con DPR 1 y de hasta 704 px con DPR 2, con un presupuesto propuesto de 90 KiB y 180 KiB por archivo, respectivamente. Se comprueban el recurso seleccionado, la ausencia de desbordamiento y el espacio reservado 16:9. Se difiere la carga de las tarjetas fuera del área visible. |
| HU51-07 | El enlace de la acción WhatsApp abre la misma ficha y su HTML inicial presenta la imagen de la versión vigente como `og:image`. Una petición anónima obtiene la imagen por HTTPS, con el título como `og:image:alt`. Al quitar la portada, el HTML anuncia la imagen de categoría. Se verifica la vista previa en un cliente real de WhatsApp sobre un entorno público autorizado. |

Se verifica además que usuarios sin sesión o de otros roles no puedan cambiar
portadas. Un curso sin publicar no puede revelar la imagen, otros datos
privados ni metadatos a través de las rutas públicas. Las pruebas cubren cambio
concurrente, persistencia tras error, recursos de versiones retiradas y ausencia
de bytes de imagen en las respuestas del catálogo.

## Pila, estructura y estilo

- Node.js 24, npm 11, TypeScript, Fastify 5 y PostgreSQL 17 en
  `backend/src/modules/cursos/`, `backend/src/plugins/permisos.ts` y
  `backend/migraciones/`. Redis 8 mantiene los controles de acceso existentes.
- React 19, Vite 8, React Router 7 y MSW en `frontend/src/paginas/cursos/`,
  `frontend/src/servicios/cursos.ts` y `frontend/src/mocks/cursos.ts`.
  Express 5 sirve el HTML en `frontend/servidor.js`.
- Node Test Runner y Fastify `inject` en `backend/test/integracion/`,
  Vitest en el frontend, Node Test Runner en `frontend/test/` y
  Playwright en `e2e/prb/demo/` y `e2e/prb/real/`. El contrato y recorridos
  se documentan en `docs/API.md` y `docs/esp/`.
- Se usa camelCase para funciones y variables, PascalCase para tipos y
  componentes, y nombres nuevos de archivo sin guiones bajos. Este alias de
  `backend/src/modules/cursos/cursos.rutas.ts` sigue la convención.

      const admiteExternos = padronDisponible && (costo === 0 || (precioGeneral !== null && modalidadCobro !== null));

## Pruebas y comandos

| Comprobación | Comando |
| --- | --- |
| Desarrollo real y demo | `npm run dev` y `npm run dev:demo` |
| Tipos, lint y pruebas del repositorio | `npm run typecheck`, `npm run lint -w frontend`, `npm test` y `npm run e2e:tipos` |
| Integración de cursos, portadas y catálogo | `NODE_ENV=test DB_NAME=gestioncapa_hu51_test node --import tsx --test --test-concurrency=1 test/integracion/portadas.test.ts test/integracion/cursos.test.ts test/integracion/catalogo.test.ts`, desde `backend/`, con PostgreSQL y Redis de pruebas. `portadas.test.ts` se añadirá tras aprobar. |
| HTML inicial y proxy Express | `npm run test:servidor -w frontend` |
| Navegador con MSW | `npm run e2e -- catalogo.spec.ts catalogoPublico.spec.ts cursos.spec.ts` |
| Navegador con API real | `npm run e2e:real -- catalogo.spec.ts catalogoPublico.spec.ts cursos.spec.ts`, con los servicios de pruebas y la base local dedicada de Playwright |
| Entrega | `npm run build` a cargo del usuario. Verificación de la ficha HTTPS, descarga anónima de la imagen y vista previa de WhatsApp en un entorno autorizado. |

La integración prueba permisos, límites, estados, persistencia y regresión del
contrato. Playwright mide la fuente descargada a 360 px y comprueba foco,
pulsación, alternativas accesibles y el recorrido desde el formulario.
Express prueba el HTML recibido sin JavaScript. La cobertura se traza por
criterio y comportamiento. Se mantiene el umbral vigente de asistencia.

## Límites y decisiones para la aprobación

- **Siempre** verificar en demo y en la API real, conservar los permisos
  existentes y registrar las pruebas roja y verde de cada incremento.
- **Aprobación de esta fase** confirmar la proporción estricta, el límite de
  píxeles, la migración aditiva, Sharp, el guardado independiente en edición y
  el alcance de recuperación de HU-40. El equipo confirma el origen público y
  el acceso al entorno HTTPS antes de acreditar WhatsApp.
- **Reservado al usuario** ejecutar builds y operaciones Git. La entrega de
  HU-51 termina con la preparación para publicar y la evidencia disponible.

El [plan de implementación](tasks/plan.md#hu-51--plan-de-implementación) y el
[seguimiento](tasks/todo.md#hu-51--tareas-de-implementación) trazan la entrega.

- Requisitos de texto alternativo, teclado, foco y reflow. [WCAG 2.1, W3C](https://www.w3.org/TR/WCAG21/)
- Metadatos de imagen y texto alternativo para el HTML inicial. [Open Graph Protocol](https://ogp.me/)
- Decodificación acotada y formatos derivados. [Constructor de Sharp](https://sharp.pixelplumbing.com/api-constructor/), [Opciones de salida de Sharp](https://sharp.pixelplumbing.com/api-output/)

# HU-54 · Pago en línea con pasarela intercambiable

## Objetivo y caso de uso

El agremiado que tiene un pago exigible por un curso puede elegir tarjeta o
Yape, revisar el importe del curso, la comisión y el total en soles, y abrir
el checkout del proveedor. Cuando el servidor verifica un cobro aprobado,
confirma automáticamente el pago, aplica las reglas de acceso de HU-53 y
encola el comprobante para el correo del titular. Un rechazo o una cancelación
definitivos dejan el pago pendiente y permiten volver a elegir un medio si
la obligación sigue vigente. La transferencia BCP y el efectivo siguen sus
procesos actuales.

La historia original fue aportada para esta revisión. Proviene de la reunión
del 09/11/2026, acuerdos A-07 y A-11. Se toma Izipay Web Core como primera
integración en sandbox, según la decisión local T-25. La historia se trata
como un solo recorrido de pago, incluida la reutilización del comprobante
existente. La contratación y habilitación del comercio corresponden al CPPP.
[ADR de T-25](docs/decisions/001-pasarelaIzipay.md) · [Criterios derivados](docs/esp/hu54Pagos.md)

## Código actual e inconsistencias

| Hallazgo | Consecuencia |
| --- | --- |
| `PagarCursoPagina` suma un 3,5 % de respaldo en el cliente. `iniciarPago` envía únicamente el importe base a Izipay y el libro financiero verifica ese importe. | El botón y la confirmación visual pueden anunciar un total distinto del cobrado. `PagoCurso`, usado también desde el historial y para constancias, abre Izipay directamente. |
| El formulario deja elegir tarjeta o Yape, pero el cliente retira `instrumento` del POST, el esquema estricto no lo acepta y el SDK no selecciona ese instrumento. La demo aprueba por defecto cuando falta el campo. | El método mostrado puede diferir del checkout real y la demo no acredita el rechazo de Yape. |
| La pantalla principal interpreta un pago todavía pendiente o un fallo de notificación como rechazo. La pantalla secundaria solo muestra verificación genérica. | Un cierre, un callback inválido o un retraso se pueden presentar como un fallo definitivo y ofrecer un nuevo intento antes de conciliar. |
| El verificador Izipay y sus fixtures usan una forma concreta de JSON firmado y buscan un UUID dentro del contenido firmado. Los ejemplos oficiales muestran variantes, como el rechazo de Yape con datos de orden y comercio en otra estructura y ejemplos con el identificador de transacción fuera de `payloadHttp`. | La evidencia local de HMAC y correlación no prueba que la forma empleada por el SDK/IPN y la búsqueda del comercio funcionen en sandbox. Se necesita comprobar correlación mediante campos auténticos del proveedor y la compatibilidad de los identificadores. |
| Alta, notificación, recuperación automática, validación de proveedor y restricciones SQL enumeran Izipay y Culqi. El mismo flag Izipay abre altas y permite conciliar las operaciones ya iniciadas. | Apagar las altas corta también la resolución de operaciones en curso. Una incorporación requiere cambiar varias capas compartidas. Culqi conserva historia y conciliación, con altas deshabilitadas por T-25. |
| El backend encola el comprobante en la transacción, pero el correo toma el importe base. La pantalla declara enviado el correo al confirmar el pago. El botón de descarga de esa pantalla usa una ruta implementada en MSW y descrita en la API, ausente del backend revisado. | El correo, el PDF, la pantalla y el libro deben mostrar datos coherentes y separar confirmación del dinero y entrega SMTP. |

## Reglas propuestas para aprobación

1. **Cotización.** El servidor ofrece las pasarelas e instrumentos configurados
   para la obligación con importe base, comisión, total y moneda PEN en céntimos.
   Se propone configurar una tasa por proveedor e instrumento, con cero explícito
   si el CPPP absorbe la comisión. Se calcula en enteros, con redondeo al céntimo
   más cercano y medias al alza. La confirmación identifica proveedor e
   instrumento y devuelve la cotización que vio el titular. Si cambió o caducó
   la oferta, el servidor devuelve conflicto y la pantalla pide volver a revisar
   el total. Una vez reservado el intento bajo bloqueo, se conserva su desglose:
   se usa en el token y el checkout, la verificación financiera y el comprobante,
   incluso si la configuración cambia. La deuda de HU-53 y el importe de los
   medios manuales siguen siendo el base.
2. **Adaptadores.** Un registro de backend resuelve cada proveedor por un
   identificador estable para cotizar, iniciar, recibir notificaciones y
   conciliar. El cliente despacha la sesión a su adaptador de checkout mediante
   un registro local de SDK y orígenes permitidos. Alta y conciliación son
   capacidades separadas. Al apagar altas, las sesiones de ese proveedor dejan
   de ofrecerse y el procesamiento de operaciones anteriores sigue disponible.
   La retirada completa del adaptador requiere conciliar lo que esté en curso
   y preservar el historial. Mientras una obligación siga en verificación, se
   mantiene su protección frente a otro cargo. Los demás pagos y proveedores
   funcionan de forma independiente.
3. **Confirmación y dinero.** Se verifica la respuesta auténtica del proveedor
   con su comercio, orden u operación, instrumento cuando es necesario para
   validar la cotización, entorno, moneda, total y referencia. Solo el servidor
   aplica el resultado verificado. Repeticiones, callbacks tardíos y carreras
   conservan un único efecto sobre la deuda, acceso y aviso. Una discrepancia,
   un ingreso adicional o un pago tardío se conservan para conciliación según
   HU-53. Una reserva vencida no recupera el cupo y el pago de constancia
   conserva su regla de liberación. El historial se muestra con importes
   realmente registrados.
4. **Estados visibles.** Una denegación o cancelación definitiva verificada
   permite volver a intentar si el pago es exigible. Si el usuario cierra el
   checkout antes de verificar el estado, se muestra que cerró la ventana y
   que el pago sigue pendiente de verificación. La interfaz distingue también
   errores de comunicación e incidencias. Solo un resultado definitivo permite
   quitar el bloqueo financiero. Se conserva la recuperación de una sesión
   vigente cuando el proveedor y la obligación la permiten.
5. **Comprobante y privacidad.** Reutilizar la cola transaccional, el PDF y los
   estados SMTP existentes. El comprobante de recepción detalla base, comisión,
   total, PEN, medio, referencia y fecha a partir del registro persistido.
   La descarga existente en el cliente se sirve con permiso de propietario o
   ADMIN. La pantalla informa si el envío está pendiente, aceptado por SMTP o
   requiere revisión. El proveedor captura PAN, vencimiento, CVV y códigos Yape.
   GestionCapa conserva únicamente los metadatos financieros necesarios y, si
   aplica, la sesión efímera protegida, sin guardar tarjetas ni volcar callbacks
   completos, secretos o datos sensibles a logs, base de datos o analítica.

## Criterios de aceptación

| ID | Criterio verificable |
| --- | --- |
| HU54-01 | Dado un pago exigible y una opción en línea activa, las dos entradas existentes muestran base, comisión y total del servidor antes de abrir el checkout. Cambiar instrumento actualiza el desglose, una cotización obsoleta exige confirmación nueva y manipular el importe no inicia un cargo. El token y el checkout reciben exactamente el total aceptado. |
| HU54-02 | Dada una autorización auténtica, el pago pasa a confirmado sin intervención administrativa, se aplica una vez el efecto de HU-53 y se encola un único comprobante por la confirmación. La consulta, el PDF y el correo reflejan los importes registrados. El estado SMTP distingue aceptación y fallo. Una repetición o un fallo SMTP no altera la decisión financiera. |
| HU54-03 | Una denegación o cancelación definitiva conserva la deuda pendiente y la pantalla muestra el resultado correcto, incluso después de recargar. Cerrar la ventana da un mensaje claro y, si falta evidencia definitiva, el intento sigue en verificación sin permitir un cargo paralelo. |
| HU54-04 | El checkout de tarjeta y Yape se captura en el proveedor. Los formularios propios, las solicitudes de inicio, las respuestas de la API, el almacenamiento, los logs y el correo excluyen datos de tarjeta y códigos Yape. Eventos sin prueba auténtica, cruzados de comercio o entorno, o con discrepancias no confirman. |
| HU54-05 | Con dos adaptadores en una prueba de integración, registrar o quitar uno conserva operativo el otro. Apagar altas de uno oculta su oferta y conserva su conciliación mientras siga instalado. BCP acepta voucher con el importe base y revisión administrativa, y efectivo registra el mismo importe con permisos y auditoría. Culqi conserva sus cobros históricos. |
| HU54-06 | El recorrido de pruebas usa identidades, medios y credenciales de prueba. La integración local verifica aprobaciones, fallos y cancelación con fixtures y dobles. La aceptación de Izipay se comprueba por separado contra su sandbox oficial con tarjeta y Yape habilitados. Producción arranca con las altas apagadas y solo se activa con contratación, configuración y autorización del CPPP. |
| HU54-07 | Los intentos históricos sin desglose se verifican con su importe original. Reintentar una clave con otra solicitud genera conflicto. Dos inicios concurrentes, notificaciones repetidas, un pago recibido después del vencimiento y un abono manual simultáneo mantienen las invariantes de HU-53 y HU-32. |

## Pila, estructura y estilo

Fastify 5, Node.js con TypeScript, Zod, PostgreSQL y Redis en backend.
React 19, Vite, TanStack Query y MSW en frontend. El dominio financiero está en
`backend/src/modules/pagos/`, la cola en `backend/src/modules/notificaciones/`,
y los cambios de esquema irán en migraciones nuevas de `backend/migraciones/`.
Las pantallas viven en `frontend/src/paginas/pagos/` y
`frontend/src/paginas/cursos/`, con sus clientes en `frontend/src/servicios/`.
Las pruebas siguen `backend/test/`, `backend/test/integracion/`, archivos
Vitest junto al código y `e2e/prb/{demo,real}/`.

Se aplica `camelCase` a funciones y variables, `PascalCase` a tipos y
componentes y nombres nuevos de archivo sin guion bajo. Se preservan nombres
externos y migraciones históricas. Como ejemplo real de la protección al
persistir un cambio de pago, la confirmación actual delega al flujo transaccional
existente en `pagos.repositorio.ts`.

```ts
return conPago(operacion.pagoId, (cliente,pago) => guardarHecho(cliente,pago,operacion,hecho,null));
```

## Estrategia de pruebas y comandos

| Nivel | Comando y alcance |
| --- | --- |
| Backend focalizado | Desde `backend/`, `node --import tsx --test test/izipay.test.ts test/culqi.test.ts test/pagosConfiguracion.test.ts`. Añadir las pruebas unitarias nuevas al comando focalizado que corresponda. |
| Persistencia y API | Desde `backend/`, con PostgreSQL y Redis aislados, `NODE_ENV=test DB_NAME=gestioncapa_hu54_test node --import tsx --test --test-concurrency=1 test/integracion/pagosCurso.test.ts test/integracion/cobroCurso.test.ts test/integracion/correoPago.test.ts test/integracion/transferenciasPago.test.ts test/integracion/voucherPago.test.ts`. Cubrir regresión, migración, transacciones y SMTP de prueba. |
| Frontend focalizado | `npm exec -w frontend -- vitest run src/servicios/pagos.test.ts src/paginas/cursos/PagoCurso.test.tsx`. Añadir cobertura de la pantalla principal y SDK. |
| Navegador | `npm run e2e -- inscripcionCurso.spec.ts pagoEnLinea.spec.ts` en demo y `npm run e2e:real -- inscripcionCurso.spec.ts transferenciaPago.spec.ts pagoEnLinea.spec.ts` con la BD y Redis dedicados. `pagoEnLinea.spec.ts` se incorpora al implementar. La ejecución local de API real usará una frontera de proveedor controlada. El sandbox oficial requiere un entorno HTTPS de pruebas y sus propias credenciales. |
| Comprobación general | `npm run typecheck`, `npm run lint -w frontend`, `npm test`, `npm run e2e:tipos` y `git diff --check`. |
| Desarrollo y entrega | `npm run dev` para backend y frontend, `npm run dev:demo` para MSW y `npm run build` para ejecución manual del usuario. |

Se exige evidencia roja y verde por comportamiento nuevo y trazabilidad de los
criterios con pruebas unitarias, integración o navegador. La firma, la
correlación, la idempotencia, la privacidad, accesibilidad por teclado y
acciones tras recargar se comprueban de forma explícita. Se mantiene el umbral
de cobertura vigente del repositorio.

## Límites y decisiones para la aprobación

- **Siempre** conservar evidencia de la fuente financiera, reutilizar los
  controles de acceso y la cola existentes, y comprobar la historia de pagos
  durante las migraciones. El plan incluye revisión de calidad y seguridad
  contra `~/.agents/agent-skills/references/definition-of-done.md` y
  `~/.agents/agent-skills/references/security-checklist.md`.
- **Aprobar ahora** el desglose por opción, la transición ante un cierre
  indeterminado, la preparación de la descarga existente y la separación
  entre altas y conciliación. El equipo debe confirmar el esquema comercial de
  comisión que verá el agremiado. En pruebas se usarán tasas ficticias.
- **Antes de acreditar el sandbox externo** conseguir un entorno HTTPS
  autorizado y credenciales sandbox por el canal de secretos del equipo.
  Validar habilitación y límites de Yape, campos obligatorios de facturación,
  formatos reales de token/SDK/IPN/consulta, identificadores, correlación y
  señales definitivas de cancelación con el comercio de prueba.
- **Reservado al usuario** build, operaciones Git y decisión de publicar.
  Activar producción requiere que el CPPP confirme el contrato, credenciales
  y métodos activos, la tarifa y el destino BCP vigentes, y que Operaciones
  compruebe HTTPS/IPN, SMTP, monitoreo y reversión.
- **Fuera de alcance** contratar otro proveedor, alta nueva por Culqi, crear
  un panel de configuración, rehacer el flujo administrativo de BCP o efectivo
  y automatizar devoluciones, pagos parciales o facturación tributaria.

Fuentes oficiales consultadas para el contrato de la integración.
[Inicio rápido de Izipay](https://developers.izipay.pe/web-core/quickstart/) ·
[Pago con Yape](https://developers.izipay.pe/web-core/use-cases/pay_with_yape_code/) ·
[Validación de firma](https://developers.izipay.pe/web-core/Modalidades/firma-validation/) ·
[API de pruebas y producción](https://developers.izipay.pe/api/) ·
[Credenciales por entorno](https://developers.izipay.pe/credentials/)

Estado. Especificación y plan aprobados para implementar. La evidencia local
incluye la API y PostgreSQL con respuestas de prueba firmadas, SMTP local y
Playwright con el SDK y la petición de sesión sustituidos. El ensayo contra
el sandbox oficial de Izipay queda pendiente de un comercio de prueba.
[Plan](tasks/plan.md#hu-54--plan-de-implementación) ·
[Seguimiento](tasks/todo.md#hu-54--tareas-de-implementación)

# T-26 · Backend en capas por módulo (MVC + SOLID)

Estado: **implementada en los 15 componentes** con capas globales; build y commits manuales pendientes.

> **Cambio de decisión (24/11/2026).** Tras los pilotos, el usuario pidió carpetas
> **globales por capa** (`src/controllers/<componente>/`, `src/dto/<componente>/`…)
> en lugar de capas dentro de cada módulo, y migrar todos los módulos. Se añadieron
> `providers/` (integraciones externas), `routes/` (composición), `seeds/` y `jobs/`.
> La estructura y las reglas vigentes están en [docs/arquitecturaBackend.md](docs/arquitecturaBackend.md);
> las secciones siguientes conservan la propuesta original como registro.
Fecha: 24/11/2026, America/Lima. Base local: `cf21d8e`, etiqueta `v3.1.0.0.0`.
Plan: [tasks/plan.md](tasks/plan.md#t-26--plan-backend-en-capas) ·
Seguimiento: [tasks/todo.md](tasks/todo.md#t-26--tareas-backend-en-capas).
`T-26` es un identificador de trabajo provisional (T-25 ya existe); falta la clave de Jira.

## Objetivo y caso de uso

Como equipo de desarrollo, queremos que cada módulo del backend separe sus
responsabilidades en capas fijas (controlador, DTO, servicio, repositorio y
entidad), para poder probar las reglas de negocio sin base de datos, añadir
módulos nuevos con una plantilla conocida y cambiar SQL o HTTP sin tocar la
lógica. El usuario final no percibe cambios: el contrato HTTP se mantiene.

MVC en una API JSON: **Modelo** = entidades + servicios + repositorios;
**Vista** = forma de la respuesta JSON (DTO de salida); **Controlador** =
manejadores Fastify. No se introducen plantillas HTML.

Decisiones confirmadas por el usuario (24/11/2026):

1. Capas **por módulo**: `src/modules/<modulo>/{controllers,dto,services,repositories,entities}`.
2. Carpetas **en inglés**; funciones, variables y mensajes siguen en español.
3. Alcance de esta entrega: **base común + dos pilotos (`usuarios`, `asistencia`)
   + plan de migración y crecimiento** para los otros 13 módulos.

## Estado comprobado e inconsistencias

| # | Hallazgo | Evidencia |
|---|---|---|
| I-1 | Nombres de capa mezclados: `*.rutas.ts`/`*.routes.ts`, `*.servicio.ts`/`*.service.ts` | `asistencia.routes.ts`, `cursos.rutas.ts`, `auth.service.ts`, `registro.servicio.ts` |
| I-2 | SQL dentro de rutas (controladores) | `usuarios.rutas.ts` 20 consultas y transacciones; `reuniones.rutas.ts` 9; `pagos.rutas.ts` 4; `cursos.rutas.ts` 2; `correo.rutas.ts` 2; `certificados.rutas.ts` 1 |
| I-3 | SQL en servicios y reglas en repositorios | `asistencia.service.ts` consulta curso cerrado; `asistencia.repositorio.ts` calcula PRESENTE/AUSENTE |
| I-4 | Cinco ayudantes de transacción duplicados y `Consultor` definido en `clases` | `transaccion` (cursos), `conTransaccion` (reuniones), `conClaseBloqueada`, `conInstructorBloqueado`, `conPago` |
| I-5 | Errores de dominio duplicados y ayudantes de respuesta locales | `ErrorPago`, `ErrorCertificado`, `ErrorHistorial`; `error`/`enviarError` en 3 rutas |
| I-6 | Ciclos entre módulos | `cursos ↔ clases`, `cursos ↔ pagos` |
| I-7 | `pool` global importado directamente: la lógica no se prueba sin PostgreSQL (incumple DIP) | 40 archivos con consultas |
| I-8 | Semillas y procesos mezclados con código de ejecución | `*.semilla.ts` en módulos; `src/cobro.procesos.ts` en la raíz |
| I-9 | El script de cobertura depende de la estructura plana | `test:cobertura` usa `src/modules/asistencia/*.ts` |
| I-10 | Integración local no ejecutable hoy: 5432/6379 ocupados por contenedores de otro proyecto (`28P01`) | 0/189 pruebas de integración; 383/383 unitarias y tipos OK |
| I-11 | Petición de «hacer commit» frente a AGENTS.md | Se respeta AGENTS.md: el agente prepara Summary/Description y el usuario hace commit |

## Arquitectura objetivo

```
backend/src/
  app.ts                      registra <modulo>.module.ts en el orden actual
  shared/                     database, transaccion, errorAplicacion, validacion, redis…
  plugins/                    autorización, permisos, errores, http (sin cambios de contrato)
  modules/<modulo>/
    <modulo>.module.ts        raíz de composición: repositorio(pool) → servicio → controlador
    controllers/              HTTP: lee la solicitud, valida con DTO, llama al servicio, responde
    dto/                      esquemas Zod de entrada, tipos inferidos y forma de salida
    services/                 reglas y casos de uso; dependencias recibidas por parámetro
    repositories/             SQL con pg; sin reglas de negocio ni Fastify
    entities/                 tipos de dominio (sin dependencias)
```

Reglas de dependencia (se verifican con una prueba de arquitectura):

| Capa | Puede importar | No puede importar |
|---|---|---|
| controllers | dto, services (tipos y fábrica), shared, plugins (tipos) | repositories, `pg`, `shared/database` |
| services | entities, dto (tipos), `import type` de repositories, shared (errores) | `fastify`, `pg`, `shared/database`, controllers |
| repositories | entities, shared (database, transaccion) | `fastify`, services, controllers, dto |
| dto | `zod`, entities | todo lo demás |
| entities | nada (solo tipos) | todo |

Aplicación de SOLID:

- **S**: cada capa tiene un solo motivo de cambio (HTTP, regla, SQL, forma de datos).
- **O**: un módulo nuevo se añade con un archivo `*.module.ts` y una línea en `app.ts`.
- **L**: los repositorios falsos de las pruebas cumplen el mismo tipo que los reales.
- **I**: cada servicio declara solo los métodos de repositorio que usa.
- **D**: los servicios reciben repositorios, reloj, verificador de QR y secretos
  por parámetro (`crearXService(deps)`); solo `*.module.ts` conoce `pool` y `env`.

Estilo: funciones fábrica en lugar de clases ni contenedor de inyección, siguiendo
el estilo funcional del repositorio:

```ts
// services/usuariosService.ts
export function crearUsuariosService(deps: { repositorio: UsuariosRepository; cifrar: (clave: string) => Promise<string> }) {
  return {
    async crear(datos: AltaUsuarioDto, actorId: number) {
      return deps.repositorio.enTransaccion(async (tx) => {
        await tx.bloquearGestion();
        if (!(await tx.esAdminActivo(actorId))) throw new ErrorAplicacion(403, 'SIN_PERMISO', 'No tienes permiso para gestionar usuarios.');
        // …
      });
    }
  };
}
```

Nombres: archivos `camelCase` sin guiones bajos (`usuariosController.ts`,
`usuarioDto.ts`, `usuariosService.ts`, `usuariosRepository.ts`, `usuario.ts`);
raíz del módulo con el estilo de punto ya usado (`usuarios.module.ts`).
Columnas SQL (`password_hash`, `class_id`) se conservan y se convierten a alias.

## Criterios de aceptación

- **CA-1 Estructura.** `usuarios` y `asistencia` contienen solo `controllers/`,
  `dto/`, `services/`, `repositories/`, `entities/` y `<modulo>.module.ts`; los
  archivos planos anteriores desaparecen y nada los importa.
- **CA-2 Dependencias.** `test/arquitectura.test.ts` falla si un módulo migrado
  rompe la tabla de reglas, y pasa con ambos pilotos.
- **CA-3 Contrato HTTP intacto.** Mismas rutas, métodos, códigos de estado,
  `code`, `message`, `fields` y cabeceras (`Cache-Control` de usuarios).
  `usuariosCppp`, `asistencia`, `permisos`, `roles`, `rolesCppp`,
  `sesionesCurso`, `modalidadSesion`, `sesionesVirtuales`, `certificados` y
  `cobroCurso` pasan sin modificar sus aserciones (solo se ajusta un import).
- **CA-4 Reglas probadas sin BD.** Pruebas unitarias con repositorios falsos cubren:
  *usuarios*: actor no admin → 403, cuenta propia → 409 `CUENTA_PROPIA`,
  correo duplicado → 409 `CORREO_REGISTRADO`, usuario inexistente → 404,
  la respuesta no incluye la clave, la auditoría registra anterior/nuevo y motivo;
  *asistencia*: QR inválido 422, expirado 410, de otra clase 409, clase inexistente
  404, cancelada 409, virtual 409, curso cerrado 409, no inscrito 403,
  repetida 409 con hora, QR que vence al bloquear 410, instructor ajeno 403,
  resumen presentes/ausentes.
- **CA-5 Base común.** `ErrorAplicacion` responde `{code,message}` con su estado
  mediante el manejador de errores existente; `conTransaccion` hace commit,
  rollback y libera el cliente; `Consultor` vive en `shared/database.ts`.
- **CA-6 Sin regresiones ni dependencias nuevas.** `npm run typecheck -w backend`
  y `npm test -w backend` en verde; `package.json` sin paquetes nuevos;
  `test:cobertura` sigue midiendo asistencia con umbral 60 %.
- **CA-7 Crecimiento documentado.** Guía `docs/arquitecturaBackend.md`
  (estructura, reglas, plantilla de módulo nuevo, plan por fases) y
  ADR-002; README actualizado.
- **CA-8 Convenciones.** Ningún nombre nuevo con guion bajo; sin cambios en
  migraciones ni en variables de entorno.

## Comandos

```bash
npm run typecheck -w backend                 # tipos (permitido)
npm test -w backend                          # unitarias, incluye arquitectura
node --import tsx --test --test-concurrency=1 backend/test/integracion/<x>.test.ts  # integración (requiere T0)
npm run test:cobertura -w backend            # cobertura de asistencia
npm run build                                # SOLO el usuario, manual
```

## Estrategia de pruebas

- Prueba de arquitectura (unitaria, sin BD) como función de aptitud.
- Pruebas unitarias nuevas por servicio con repositorios falsos (`node:test`).
- Las pruebas de integración existentes actúan como red de caracterización:
  se ejecutan antes y después de cada migración y no cambian sus aserciones.
- Ciclo por tarea: prueba nueva en rojo → implementación → verde → integración.

## Límites

- **Siempre:** conservar el contrato HTTP y la matriz de permisos; mover sin
  reescribir el SQL; una tarea a la vez con pruebas verdes; nombres sin `_`.
- **Preguntar antes:** instalar paquetes (p. ej. `dependency-cruiser`), cambiar
  contenedores o puertos de Docker, cambiar SQL o migraciones, migrar módulos
  fuera de los pilotos.
- **Nunca:** commit, push, tag, PR ni build por el agente; borrar o debilitar
  pruebas; cambiar respuestas de la API como efecto lateral.

## Fuera de alcance

Migración de los 13 módulos restantes (queda planificada), romper los ciclos
`cursos ↔ clases/pagos`, unificar `ErrorPago`/`ErrorCertificado`/`ErrorHistorial`,
ORM o query builder, contenedor de inyección, cambios en el frontend.

## Preguntas abiertas

1. **Entorno de integración (bloquea la verificación CA-3).** ¿Autorizas
   levantar `gestioncapa-postgres` y `gestioncapa-redis` en puertos alternos
   (`POSTGRES_PORT=55432 REDIS_PORT=56379 docker compose up -d --wait`) y
   ejecutar la integración con `DB_PORT=55432` y `REDIS_URL` en esos puertos,
   sin tocar los contenedores del otro proyecto? Alternativa: los detienes tú.
2. Clave de Jira para sustituir `T-26`.
3. ¿Aceptas `providers/` como sexta carpeta opcional para integraciones externas
   (pasarelas, SMTP, Jitsi) cuando se migren `pagos`, `notificaciones` y `jitsi`?

## Soluciones existentes

Canales consultados el 24/11/2026: repositorio (`rg`), registro npm
(`npm view`, solo lectura), búsqueda web de GitHub y documentación de Fastify,
Astryx CLI 0.7.16, skills instaladas (`~/.agents/agent-skills`, `~/.claude/skills`).
**No consultados:** GitHub CLI (`gh` no instalado; los repositorios hallados por
búsqueda web no se inspeccionaron a fondo) y servidores MCP del proyecto (no hay
`.mcp.json`; ningún MCP disponible cubre arquitectura de backend).
Astryx no aplica: es de interfaz y `astryx search "backend architecture"` no
devuelve resultados. No se instala nada.

| Capacidad | Candidatos evaluados | Decisión | Justificación |
|---|---|---|---|
| Transacción común | `conTransaccion` de `reuniones.repositorio.ts`; `transaccion` de cursos | **Extender** | Ya probado en producción; se mueve a `shared/transaccion.ts` aceptando el pool por parámetro. Sin dependencias. Los demás ayudantes se reemplazan en sus fases. |
| Tipo `Consultor` | `clases.repositorio.ts` | **Adoptar** (mover) | Se traslada a `shared/database.ts`; `clases` lo reexporta hasta su fase. |
| Errores de dominio → HTTP | `plugins/errores.ts`; `@fastify/sensible` `httpErrors` (ya instalado, MIT); `ErrorPago`/`ErrorCertificado` | **Extender** | `httpErrors` usa mensajes genéricos que no coinciden con los mensajes en español del contrato; se añade `ErrorAplicacion(status, code, message)` y se trata en el manejador existente. |
| Validación DTO | `zod` 4 (ya instalado, MIT); `fastify-type-provider-zod` 7.0.0 (MIT, 06/2026, peer `@fastify/swagger`) | **Adoptar `zod`**; descartar el type provider | El type provider cambia el formato de los errores 400/422 y rompería CA-3. `shared/validacion.ts` ya da los mensajes por campo. |
| Inyección de dependencias | `awilix` 14.0.0 y `@fastify/awilix` 8.3.2 (MIT, activos); `inversify` 8.3.0 (MIT); `tsyringe` 4.10.0 (MIT, sin publicar desde 04/2025) | **Construir** (fábricas + `*.module.ts`) | Con 15 módulos funcionales, la composición manual es explícita y no añade dependencias. `inversify`/`tsyringe` exigen decoradores y `reflect-metadata`. Revisar `@fastify/awilix` si el grafo crece. |
| Registro de módulos | `@fastify/autoload` 6.6.0 (MIT, 0 deps) | **No adoptar** | `app.ts` depende del orden (`reuniones` y `pendientes` al final); la carga por carpetas lo volvería implícito. |
| Verificar reglas de capas | `dependency-cruiser` 18.9.0 (MIT, 18 deps); `eslint-plugin-boundaries` 7.4.4 (MIT, requiere ESLint, que el backend no usa); `madge` 8.0.0 (MIT, sin publicar desde 08/2024) | **Construir ahora**; proponer `dependency-cruiser` en la fase de cierre | Una prueba `node:test` que lee los `import` basta para dos pilotos y no añade dependencias. Para los ciclos de todo el backend, `dependency-cruiser` es la mejor opción (pide autorización). |
| Plantilla de estructura | Plantillas Fastify+TS en GitHub (NeaDigitra/Fastify-TS-API, gubiar/real-world-fastify, AndresH11/Node-TypeScript-Fastify) | **Componer** solo el patrón | Imponen ORM (Prisma) o clases; se toma la separación controller/service/repository y se adapta a `pg` y al estilo funcional. |
| Skills | `api-and-interface-design`, `deprecation-and-migration`, `documentation-and-adrs` | **Adoptar** | Guían los contratos entre capas, la migración por fases y el ADR-002. |

## HU-39 · Asistencia presencial con QR personal o DNI

[Especificación de HU-39](docs/esp/sprints/asistencia-presencial/hu-39/SPEC.md) en el sprint Asistencia presencial.


## HU-41 · Iniciar sesión con Google

[Especificación y soluciones](docs/esp/sprints/acceso/hu-41/SPEC.md) en el sprint Acceso.
