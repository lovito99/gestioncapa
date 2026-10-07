# Especificación: HU-04 programar clase presencial

## Historia

Como coordinador, quiero crear, editar y cancelar una clase presencial con
instructor, fecha, hora y lugar, para organizar la sesión y habilitar el registro
de asistencia.

## Alcance y decisiones

- Se implementa en el backend el contrato de [API](../API.md) que la interfaz ya
  usa con MSW (ver [clases](clases.md), CLA-01…04): `GET /instructores`,
  `GET /clases`, `GET /clases/:id`, `POST /clases`, `PUT /clases/:id`,
  `POST /clases/:id/cancelar` y `GET`/`POST /clases/:id/inscritos`.
- **Hora de Lima.** `fecha` (`YYYY-MM-DD`) y `horaInicio`/`horaFin` (`HH:mm`) se
  guardan como fecha y hora locales de Lima (`date` y `time` sin zona) y se
  devuelven tal como se enviaron. Nunca se convierten a UTC.
- **Validación en el servidor** (independiente del formulario): 422 `VALIDACION`
  con un mensaje general y `fields.<campo>` en español por cada problema. Campos
  requeridos: `nombre`, `instructorId`, `fecha`, `horaInicio`, `horaFin`, `lugar`.
  También se valida el formato, que la hora de fin sea posterior a la de inicio y
  que `instructorId` sea un instructor activo.
- **Conflicto de horario** (detallado en [HU-05](solapamiento.md)). El mismo instructor no puede tener dos clases
  `PROGRAMADA` que se crucen el mismo día: 409 `CONFLICTO_HORARIO`, con un mensaje
  que nombra la clase, la fecha y el horario, y `details.claseId`. Un horario
  contiguo (una termina 11:00, la otra empieza 11:00) se acepta. Al editar no se
  compara consigo misma; las clases canceladas no cuentan.
- **Cancelación.** `PROGRAMADA → CANCELADA`, irreversible. Una clase cancelada no
  se edita, no se vuelve a cancelar, no admite inscripciones y no genera QR:
  409 `CLASE_CANCELADA`.
- **QR.** Generar el QR rotativo es otra historia. `GET /clases/:id/qr` ya valida
  la clase: 404 si no existe, 403 si es de otro instructor y 409 si está
  cancelada. Para una clase programada sigue respondiendo 501 `NO_IMPLEMENTADO`.
- **Permisos.** Los aplica la matriz de T-04 ([permisos](permisos.md)). El
  instructor solo ve el detalle de sus propias clases.
- Id inexistente o no numérico: 404 `CLASE_NO_EXISTE`.

## Criterios de aceptación

```gherkin
# language: es
Característica: Programar clase presencial

  Escenario: PRG-01 Crear una clase válida
    Dado un coordinador autenticado
    Cuando guarda una clase con nombre, instructor, fecha, horas y lugar válidos
    Entonces responde 201 con la clase en estado PROGRAMADA y 0 inscritos
    Y la fecha y las horas son exactamente las enviadas (hora de Lima)
    Y la clase aparece en GET /api/clases con su instructor

  Esquema del escenario: PRG-02 Campo requerido faltante
    Dado un coordinador autenticado
    Cuando envía la clase sin <campo>
    Entonces responde 422 VALIDACION con fields.<campo> = "<mensaje>"
    Y no se crea ninguna clase

    Ejemplos:
      | campo        | mensaje                          |
      | nombre       | Ingresa el nombre de la clase    |
      | instructorId | Selecciona un instructor         |
      | fecha        | Ingresa la fecha de la clase     |
      | horaInicio   | Ingresa la hora de inicio        |
      | horaFin      | Ingresa la hora de fin           |
      | lugar        | Ingresa el lugar                 |

  Escenario: PRG-03 Datos con formato o rango inválido
    Cuando la fecha no existe, una hora no es HH:mm o la hora de fin no es
      posterior a la de inicio
    Entonces responde 422 con el campo afectado y no se crea la clase

  Escenario: PRG-04 Instructor inválido
    Cuando instructorId no corresponde a un instructor activo
    Entonces responde 422 con fields.instructorId

  Escenario: PRG-05 Conflicto de horario
    Dado una clase programada del instructor de 10:00 a 11:00
    Cuando se programa otra de 10:30 a 11:30 el mismo día
    Entonces responde 409 CONFLICTO_HORARIO nombrando la clase existente
    Y una de 11:00 a 12:00 sí se acepta
    Y editar una clase sin cambiar su horario no choca consigo misma
    Y una clase cancelada no genera conflicto

  Escenario: PRG-06 Editar una clase
    Dado una clase programada
    Cuando el coordinador cambia el lugar
    Entonces responde 200 con el lugar nuevo
    Y editar una clase inexistente responde 404 y una cancelada 409

  Escenario: PRG-07 Cancelar una clase activa
    Dado una clase programada
    Cuando el coordinador confirma la cancelación
    Entonces responde 200 con estado CANCELADA
    Y cancelarla otra vez responde 409 CLASE_CANCELADA

  Escenario: PRG-08 Una clase cancelada no admite inscripciones ni QR
    Dado una clase cancelada
    Cuando se inscribe un participante o el instructor pide el QR
    Entonces ambos responden 409 CLASE_CANCELADA
    Y en una clase programada la inscripción sí se crea (201)

  Escenario: PRG-09 Usuario sin rol de coordinador
    Dado un instructor, un participante o un administrador autenticado
    Cuando intenta crear, editar o cancelar una clase
    Entonces el servidor responde 403 SIN_PERMISO
    Y el número de clases y el estado de la clase no cambian

  Escenario: PRG-10 Recorrido con el backend real
    Dado la coordinadora del seed en el navegador
    Cuando crea una clase, edita su lugar y la cancela con confirmación
    Entonces la clase aparece en la lista, con el lugar nuevo, y luego como Cancelada
    Y si el servidor detecta un conflicto de horario, el formulario lo muestra sin salir
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| PRG-02…04 | Unitaria (validación pura) | `backend/test/clases.validacion.test.ts` |
| PRG-01…09 | Integración (Postgres y Redis) | `backend/test/integracion/clases.test.ts` |
| PRG-10 | E2E real | `e2e/prb/real/clases.spec.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas:

- Unitarias: fallaron porque `validarClase` no existía.
- Integración: se ejecutó la suite contra el código anterior (stash temporal de
  `backend/src`): **12/12 en rojo**, porque todas las rutas de clases respondían 501
  `NO_IMPLEMENTADO` (la matriz de T-04 ya exigía el rol, pero no había lógica).
- E2E PRG-10: se escribió después del backend y pasó a la primera; su rojo no se
  ejecutó (con el código anterior, la lista de clases respondía 501).

**Verde.** Tablas `clases` e `inscripciones`, validación pura y rutas con
transacción por instructor para el conflicto de horario. Resultado: unitarias del
backend 106/106; integración 52/52 en una copia aislada de Docker Compose
(PRG-01…09, PER, ROL y AMB); E2E real 12/12, repetido para confirmar que
`gestioncapa_e2e` se limpia entre ejecuciones.
