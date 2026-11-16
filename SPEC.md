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
