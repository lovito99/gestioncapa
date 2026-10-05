# Contrato de API que necesita el frontend

**Ruta base:** todas las rutas empiezan con `/api`. El JSON lleva los campos en español, como `nombre` o `fecha`. La definición completa de los tipos está en [`frontend/src/types/api.ts`](../frontend/src/types/api.ts). Las respuestas simuladas de referencia están en [`frontend/src/mocks/handlers.ts`](../frontend/src/mocks/handlers.ts).

## 1. Reglas generales

- **Autenticación:** el frontend envía `Authorization: Bearer <token>` en todas las peticiones, salvo en el login.
- **Identificadores:** van como **texto** (`"id": "12"`), no como número.
- **Fechas y horas:** `fecha` en formato `YYYY-MM-DD` y horas en `HH:mm`, en hora de Lima. Los momentos exactos van en ISO 8601, por ejemplo `2026-10-12T10:02:00-05:00`.
- **Formato único de error.** Todas las respuestas 4xx deben tener esta forma:

  ```json
  { "code": "CONFLICTO_HORARIO", "message": "Texto para mostrar al usuario", "fields": {}, "details": {} }
  ```

  El frontend muestra `message` tal como llega, así que debe estar en español y ser claro para el usuario. `fields` se usa solo en validaciones: lleva el error de cada campo, con el nombre del campo como clave.

## 2. Roles

Hay dos roles, `COORDINADOR` e `INSTRUCTOR`. Hoy la base de datos solo tiene `admin`.

## 3. Rutas

| Método | Ruta | Quién | Respuesta OK | Errores |
|---|---|---|---|---|
| POST | `/auth/login` `{email, password}` | público | `200 { token, usuario: {id, nombre, email, rol, cargo} }` | 401 `CREDENCIALES_INVALIDAS` |
| POST | `/auth/logout` | autenticado | `204` | — |
| GET | `/instructores` | coordinador | `200 [{id, nombre}]` | — |
| GET | `/clases` | coordinador | `200 Clase[]` | 401 `NO_AUTENTICADO` |
| GET | `/clases/:id` | ambos | `200 Clase` | 404 `CLASE_NO_EXISTE` |
| POST | `/clases` `ClaseEntrada` | coordinador | `201 Clase` | 422 `VALIDACION` (con `fields`), 409 `CONFLICTO_HORARIO` (con `details.claseId`) |
| PUT | `/clases/:id` `ClaseEntrada` | coordinador | `200 Clase` | igual que el anterior, más 404 |
| POST | `/clases/:id/cancelar` | coordinador | `200 Clase`, con `estado: "CANCELADA"` | 404 |
| GET | `/clases/:id/inscritos` | coordinador | `200 [{id, nombre, email}]` | 404 |
| POST | `/clases/:id/inscritos` `{email}` | coordinador | `201 Participante` | 404 `PARTICIPANTE_NO_EXISTE`, 409 `YA_INSCRITO` |
| GET | `/clases/:id/asistencia` | coordinador | `200 {inscritos, presentes, ausentes, registros: [{participante, estado: "PRESENTE"/"AUSENTE", horaRegistro}]}` | 404 |
| GET | `/instructor/clases` | instructor | `200 Clase[]`: solo sus clases en estado `PROGRAMADA` | 401 |
| GET | `/clases/:id/qr` | instructor | `200 {token, expiraEn, servidorAhora, duracionSegundos}` | 404 |

**`Clase`:** `{ id, nombre, instructor: {id, nombre}, fecha, horaInicio, horaFin, lugar, inscritos (número), estado: "PROGRAMADA" | "CANCELADA" }`

**`ClaseEntrada`:** `{ nombre, instructorId, fecha, horaInicio, horaFin, lugar }`

## 4. Reglas de negocio

- **Conflicto de horario:** el mismo instructor no puede tener dos clases `PROGRAMADA` en la misma fecha con horarios que se crucen. Al editar, no se compara la clase consigo misma. El `message` debe nombrar la clase en conflicto con su fecha y hora.
- **Hora de fin:** debe ser mayor que la de inicio. Si no, se responde 422 con el error en `fields.horaFin`.
- **QR rotativo:** cada QR vale 30 segundos. Se firma en el servidor y no debe poder reutilizarse cuando vence. `servidorAhora` es obligatorio porque el frontend lo usa para corregir la diferencia con el reloj del equipo.
- **Sesión expirada:** responder 401 en cualquier ruta protegida hace que el frontend cierre la sesión.

## 5. Diferencias con el backend actual

1. El login hoy responde `{ token, user: {id (número), name, email, role} }`. El frontend espera `usuario` con `nombre`, `rol` y `cargo`.
2. Los errores salen en el formato propio de Fastify (`statusCode`, `error`, `message`). Hay que convertirlos al formato del punto 1.
3. Faltan `/auth/logout` y todas las rutas de clases, inscritos, asistencia, QR e instructores.
4. Faltan las tablas: clases, inscripciones, asistencias y participantes, y los roles nuevos.

## 6. Pendientes por definir juntos

- **Marcado de asistencia:** el QR lleva a `/asistencia/marcar?token=...`, pero todavía no existe esa pantalla ni su ruta en la API. Propuesta: `POST /asistencia/marcar { token }` hecha por el participante autenticado, que responda 200, o 409 si ya marcó, o 410 si el QR venció.
- **Participantes:** ¿inician sesión en el sistema? ¿Quién crea sus cuentas?
- **El token del login:** ¿lo dejamos en el encabezado `Authorization` o lo pasamos a una cookie `httpOnly`, que es más segura?
