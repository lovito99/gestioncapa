# HU-19 · Plan de implementación

**Estado:** implementado. Build y revisión final pendientes. [Especificación y soluciones existentes](SPEC.md) · [Seguimiento](todo.md#hu-19--seguimiento).

## Decisiones de arquitectura

- Reutilizar el alta de cursos, sus materiales `VIDEO`, `tieneAccesoCurso`,
  `conTransaccion`, los componentes de formulario y el servicio de certificados
  con retención de HU-53. Mantener las rutas por recurso y el mapa de permisos
  de Fastify. Las proyecciones de autoría, rendición y verificación pública
  tienen campos y permisos distintos.
- Guardar un máximo de intentos por curso y fijar sus reglas al publicar.
  Registrar progreso e intentos con claves únicas basadas en la inscripción y
  el recurso. La operación de entrega tiene una identidad estable para reintentos.
  Confirmar el orden curso → inscripción → registros dependientes con los
  bloqueos de curso, pagos y certificados. Evitar serializar las entregas de
  todos los alumnos entre sí y probar la carrera entre entrega y cierre.
- Extender el PDF, la vista privada y «Mis certificados» con los mismos datos
  persistidos. El verificador QR conserva su respuesta pública. Los cambios de
  esquema son aditivos. Los documentos emitidos conservan el archivo guardado.
- Tomar `RadioList`, `FormLayout`, `Banner` y `ProgressBar` de Astryx como
  referencia de interacción. Componer los controles existentes, HTML nativo
  y las dependencias declaradas por el proyecto. No hay paquetes propuestos.

## Orden y tareas verificables

Los archivos son indicativos. Cada tarea registra su prueba en rojo y en
verde, las verificaciones del incremento y un mensaje de commit para que el
usuario lo ejecute manualmente.

| ID y tarea | Depende de | Aceptación y verificación enfocada | Áreas probables | Tamaño |
| --- | --- | --- | --- | --- |
| T1 · Modalidad al generar PDF | — | Generar participaciones de cada modalidad y extraer el texto con `pdftotext`. Comprobar que el QR sigue asociado al código y que descargar un PDF histórico devuelve el archivo persistido. HU19-09. | Proveedor PDF, entidad de modalidades y pruebas de HU-20. | S |
| T2 · Política de evaluación administrable | — | En integración HTTP, comprobar 14/2 en un curso nuevo, 2 intentos y nota previa en un curso histórico, configuración válida persistida y rechazo para otro rol o valores inválidos. HU19-02. | Migración, DTO y composición de cursos, registro de permiso, integración. | M |
| T3 · Borrador del instructor | — | Guardar y leer preguntas y clave como instructor activo asignado. Probar acceso ajeno, borradores invisibles para el alumno y edición sin cambiar política de curso. HU19-01. | Migración de autoría, capas del módulo de evaluaciones, arquitectura e integración. | M |
| T4 · Publicación del cuestionario | T2, T3 | Validar la clave única, evitar segunda evaluación oficial y congelar preguntas y política. Probar materiales obligatorios válidos y rechazo de un video de otro curso. HU19-01/02/05. | Entidad, servicio, repositorio y ruta de publicación, integración. | M |
| T5 · Editor del instructor y configuración en la interfaz | T4 | En Vitest, editar opciones, elegir una correcta, elegir lecciones para la salida y publicar. Comprobar configuración 14/2 y rol del administrador, feedback de validación y navegación por teclado. HU19-01/02/05. | Vistas de cursos, servicios frontend, rutas y pruebas de componente. | M |
| T6 · Avance real de lecciones | T4 | Verificar lectura y finalización autenticadas por inscripción, persistencia, idempotencia, rechazo por falta de acceso y desbloqueo tras completar la última lección. HU19-05. | Migración y módulo de avance, acceso vigente, rutas e integración. | M |
| T7 · Lectura segura del cuestionario | T4, T6 | Consultar preguntas y opciones publicadas y el estado inicial. La salida grabada permanece bloqueada sin avance completo. Comparar la estructura exacta del JSON autorizado y la ausencia de claves y datos ajenos. HU19-03/05. | Proyecciones, servicio, registro de rutas e integración. | M |
| T8 · Calificación y límite de intentos | T7 | Probar la regla pura y la entrega transaccional. Cubrir caso límite de nota, mejora, empate, dos envíos simultáneos, reintento de una operación y respuestas inválidas sin consumo. Verificar el `409` con estado final. HU19-03/04/06. | Migración de intentos, entidad de nota, servicio, repositorio e integración. | M |
| T9 · Aula y rendición real | T5, T6, T8 | Entrar desde «Mis cursos» con la inscripción correcta, completar lecciones, refrescar el progreso, rendir y ver nota, aprobación y saldo. Probar estados bloqueado y agotado en Vitest. Mantener una regresión del aula demo separada. HU19-03/04/05/06. | Ruta de aula, página de aula y formulario, consulta y pruebas del frontend. | M |
| T10 · Elegibilidad de aprobación | T6, T8 | Para un grabado, la evaluación administrativa individual exige avance y nota. Para cursos con sesiones, el cierre conserva las condiciones de HU-20. Probar rechazo de excepción académica y coordinación entre nota y cierre. HU19-06/07. | Servicios de evaluación/certificados, consulta de cierre, vista administrativa e integración. | M |
| T11 · Emisión aprobatoria y retención | T1, T10 | Fijar nota, modalidad y tipo en el documento. Probar emisión idempotente, retención y liberación al pagar, rechazo por datos históricos pendientes, QR público sin nota ni DNI y corrección con reemplazo. Inspeccionar el PDF privado. HU19-07/08/09. | Servicio, repositorio, proveedor PDF, contratos de documento e integración. | M |
| T12 · «Mis certificados» | T11 | Un colegiado encuentra su certificado y ve y descarga la nota del documento vigente. Probar lista vacía, retención vigente y descarga denegada a otra cuenta. HU19-08. | Historial, navegación, página privada de certificado y Vitest. | M |
| T13 · Recorrido real y revisión de entrega | T9, T12 | Playwright con autoría, dos notas, grabado completado, emisión, descarga y destino QR. Revisar integración, permisos, documentación y compatibilidad. Cotejar todos los criterios HU19-01 a HU19-09. | E2E, fixtures, documentación API y evidencia en seguimiento. | M |

T1 y T2 pueden hacerse independientemente de T3. La secuencia T4 → T6 → T7 →
T8 valida temprano el riesgo de concurrencia. T9 avanza en paralelo con T10–T11
una vez fijados los contratos. Las migraciones se numeran en orden sobre el
historial comprobado de la rama al implementarlas.

## Puntos de verificación

1. **Después de T1–T4.** Contratos de borrador, publicación y política en
   PostgreSQL aislado. Regresión de PDF de participación. Revisar permisos
   antes de conectar la interfaz.
2. **Después de T5–T8.** Instructor y administrador pueden completar su
   recorrido. Confirmar desde la API real que el avance desbloquea la salida,
   la clave es privada y el último intento se consume una sola vez.
3. **Después de T9–T11.** Verificar que la mejor nota llega al certificado,
   incluido el caso de retención y liberación. Repetir los casos de HU-20,
   HU-36 y HU-53.
4. **Después de T12–T13.** Ejecutar pruebas enfocadas, suites pertinentes,
   tipos, lint y Playwright real. Registrar resultados y las regresiones de
   línea base por separado. El usuario verifica el build.

## Riesgos y verificación de seguridad

| Riesgo | Control y evidencia a registrar |
| --- | --- |
| Un usuario ve la clave o la nota ajena | Permisos + pertenencia en el servidor, DTO por rol, respuestas privadas fuera de cachés compartidas y pruebas de campos exactos en API, QR y logs. |
| Dos envíos consumen el último intento o el cierre usa una nota vieja | Una transacción con orden común de bloqueo y unicidad por operación. Ensayar concurrencia, reenvío con la misma operación y carrera entre entrega y evaluación del curso. |
| Un cambio altera lo que se califica o desbloquea | Fijar la publicación y su lista de lecciones. Ensayar modificación de configuración, intento con identificadores ajenos y retorno del mismo titular tras recargar. |
| La nueva emisión duplica el certificado, salta un pago o modifica un PDF histórico | Usar unicidad vigente, elegibilidad autorizada, entrega retenida y archivo persistido. Probar cobro previo, cobro al certificado, reemplazo y vigencia. |
| Entrada de instructor o colegiado excede los límites del sistema o introduce HTML | Validar tipos y cotas de payload en Zod, renderizar texto React, parametrizar SQL y evitar descargas de URL aportadas por el usuario desde el backend. |

En cada incremento, aplicar corrección y calidad de
`~/.agents/agent-skills/references/definition-of-done.md`. En T13, completar
integración, documentación, observabilidad de fallos con campos mínimos y
preparación de salida. Revisar autorización, entradas, datos, errores y
dependencias con `~/.agents/agent-skills/references/security-checklist.md`.
Registrar las comprobaciones aplicables y cualquier hallazgo abierto.

## Publicación y versionado previstos

- Requiere aprobación de alcance, evidencia de las pruebas, build manual y
  ensayo de migraciones sobre una copia aislada antes de una entrega. El ensayo
  debe comprobar datos previos y la vuelta al código anterior con el esquema
  ampliado. No eliminar tablas que ya contengan intentos o notas como parte de
  una reversión de aplicación.
- Conservar el carácter de demostración de los documentos hasta que el CPPP
  provea su firma autorizada y apruebe la emisión oficial. El alcance actual
  mantiene el QR institucional y no publica ni despliega.
- La base local es `v3.1.0.0.1` en `81270ca`. Para la HU completa, la
  propuesta es `v3.2.0.0.0` por **Función**, condicionada a conservar los
  contratos existentes. La versión corresponde a la entrega completa. Preparar
  mensajes `fix:` para el PDF y `feat:`, `test:` o `docs:` según cada
  incremento. El usuario realiza las operaciones Git y decide la etiqueta.
