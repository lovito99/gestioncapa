# HU-16: inscripción en línea del colegiado

## Alcance

El colegiado autenticado puede inscribirse desde el detalle de un curso publicado
de su organización. El rol técnico continúa siendo `PARTICIPANTE`.
La habilitación contra el padrón (HU-33) y la confirmación del pago (HU-32)
quedan fuera de esta entrega.

| Situación | Resultado |
|---|---|
| Curso gratuito y con cupos | Inscripción confirmada, estado `EN_CURSO`, visible en «Mis cursos» |
| Curso con costo y con cupos | Reserva `PENDIENTE_PAGO`, visible en «Mis cursos», sin mostrarse como confirmada |
| Ya inscrito | Una sola fila y respuesta con el estado guardado; no vuelve a descontar una vacante |
| Sin cupos | `409 SIN_CUPOS`, mensaje claro y botón deshabilitado cuando el detalle ya conoce la disponibilidad |
| Borrador | `409 CURSO_NO_PUBLICADO`; no permite inscribirse |
| Curso de otra organización u otro rol | `403`; sin cambios de datos |

La reserva pendiente consume una vacante para asegurar el cupo solicitado. No se
implementa vencimiento automático ni se cobra dinero. Los intentos repetidos
conservan el estado persistido aunque el precio cambie después. No se aceptan
estados de pago enviados por el cliente como confirmación.

## Contrato y concurrencia

`POST /api/cursos/:id/inscribirme` devuelve:

```json
{ "cursoId": "12", "estado": "PENDIENTE_PAGO", "yaInscrito": false }
```

Para curso gratuito, `estado` es `EN_CURSO`; para inscripción ya terminada sigue
siendo `TERMINADO`. La primera inscripción devuelve `201`, la repetida `200`.

La escritura conserva el bloqueo de la fila del curso (`FOR UPDATE`) y la clave
primaria compuesta por curso/usuario. Así se serializa la última vacante y no se
crean duplicados entre solicitudes concurrentes. Se comprueban publicación,
organización, rol y usuario activo en el servidor.

El detalle autenticado expone `estadoInscripcion`; el historial incluye el estado
y `pagoPendiente`. El catálogo público mantiene su lista explícita de campos y
no publica el estado de un usuario. La UI invalida detalle, catálogo, historial
y clases tras inscribirse; «Mis cursos», historial y PDF distinguen lo pendiente.

Para cursos gratuitos se conserva la inscripción automática en sus sesiones
programadas existentes. Una reserva pendiente de pago no realiza ese paso.
No se cambia el contrato de la inscripción manual por administrador/coordinador
en sesiones (HU-06); continúa disponible y se verifica con sus pruebas existentes.

## Migración y compatibilidad

`0012-inscripcionPendiente.sql` incorpora `PENDIENTE_PAGO` a los estados permitidos
y mantiene la fecha de finalización nula hasta que la inscripción sea terminada.
No cambia migraciones anteriores ni reclasifica inscripciones históricas por el
precio actual. Tampoco confirma reservas automáticamente mientras HU-32 no exista.

MSW conserva el estado de las nuevas inscripciones en memoria y lo reutiliza al
repetir la solicitud; no lo recalcula por el costo actual. Los datos históricos
de demostración mantienen sus estados de ejemplo.

## Verificación

- Integración: gratuita confirmada, duplicado idempotente, borradores, aislamiento,
  última plaza concurrente, reserva pagada y estado devuelto por detalle/historial.
- El curso gratuito aparece en «Mis cursos» dentro del recorrido del catálogo.
- E2E demo y real a 360 px: reserva pendiente, mensaje sin confirmación y estado
  consistente entre detalle y «Mis cursos»; la prueba real comprueba la recarga.
- Regresión de la inscripción manual de HU-06, historial y sesión.
- Build, migraciones del entorno de entrega y operaciones Git son manuales.


Verificación de esta entrega (07/11/2026): tipos de backend, frontend y E2E;
256 pruebas unitarias backend, 55 frontend y 3 del servidor frontend; 224 pruebas
de integración; nueve casos del catálogo con las comprobaciones finales de PDF
y conservación del estado; 24 E2E reales en una ejecución completa aprobada y
seis recorridos demo afectados aprobados. El ayudante del historial ahora compara
el nombre de cada entorno y el mismo DNI enmascarado, en lugar de un texto antiguo.
El lint mantiene dos advertencias preexistentes, sin errores nuevos.

Se comprobó mediante una mutación que confirmar un curso con costo rompe la
prueba de HU-16; se restauró el código original. `git diff --check` sin errores.
Para la entrega, el usuario aplica `npm run migrate` en su entorno y ejecuta
`npm run build` manualmente. No se ejecutaron builds ni escrituras de Git.
