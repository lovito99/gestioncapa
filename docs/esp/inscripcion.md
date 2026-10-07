# Especificación: HU-06 inscribir participante en clase

## Historia

Como coordinador, quiero inscribir manualmente a un participante en una clase,
para que solo personas autorizadas y verificadas puedan registrar asistencia.

## Alcance y decisiones

- `POST /api/clases/:id/inscritos` `{ email }` y `GET /api/clases/:id/inscritos`
  existen desde HU-04 ([programar](programar.md)). Esta historia fija y prueba sus reglas.
- **Solo coordinador.** Lo aplica la matriz de T-04 ([permisos](permisos.md)).
  Un participante que intenta inscribirse a sí mismo (o un instructor o admin)
  recibe 403 `SIN_PERMISO` y no se crea nada.
- **Persona verificada.** Solo se inscribe a un usuario existente, **activo** y con
  rol participante. Un correo desconocido, de otro rol o de una cuenta inactiva
  responde 404 `PARTICIPANTE_NO_EXISTE` con el mismo mensaje, sin revelar cuál es
  el caso. El correo se compara sin distinguir mayúsculas ni espacios alrededor.
- **Correo inválido.** Vacío o sin formato de correo: 422 `VALIDACION` con
  `fields.email`, sin consultar la base.
- **Sin duplicados.** La clave primaria `(clase_id, participante_id)` lo garantiza
  en la base. Repetir la inscripción responde 409 `YA_INSCRITO` con un mensaje que
  indica el estado actual («ya está inscrito(a) … desde …») y
  `details: { participanteId, inscritoEn }`, donde `inscritoEn` es la fecha-hora
  ISO 8601 de la inscripción original en hora de Lima.
- **Clase.** Inexistente: 404 `CLASE_NO_EXISTE`. Cancelada: 409 `CLASE_CANCELADA`
  (PRG-08).

## Criterios de aceptación

```gherkin
# language: es
Característica: Inscribir participante en clase

  Antecedentes:
    Dado una clase activa sin inscritos
    Y la participante María, existente y activa

  Escenario: INS-01 Inscribir a un participante existente
    Cuando el coordinador la inscribe con su correo
    Entonces responde 201 con su id, nombre y correo
    Y la lista de inscritos de la clase tiene exactamente una inscripción, la suya
    Y el contador de inscritos de la clase es 1

  Escenario: INS-02 Repetir la inscripción
    Dado que María ya está inscrita
    Cuando el coordinador la inscribe otra vez
    Entonces responde 409 YA_INSCRITO con un mensaje que indica que ya está inscrita y desde cuándo
    Y details incluye su participanteId y la fecha de la inscripción original
    Y la lista sigue con exactamente una inscripción

  Escenario: INS-03 Inscripciones simultáneas de la misma persona
    Cuando llegan a la vez cinco solicitudes para inscribir a María
    Entonces exactamente una responde 201 y las demás 409
    Y la lista tiene exactamente una inscripción

  Escenario: INS-04 Participante que intenta inscribirse a sí mismo
    Dado María autenticada como participante
    Cuando llama directamente al endpoint con su propio correo
    Entonces recibe 403 SIN_PERMISO
    Y no se crea ninguna inscripción
    Y lo mismo ocurre con un instructor o un administrador

  Esquema del escenario: INS-05 Solo personas verificadas
    Cuando el coordinador inscribe el correo de <caso>
    Entonces responde 404 PARTICIPANTE_NO_EXISTE y no se crea nada

    Ejemplos:
      | caso                           |
      | una persona que no existe      |
      | un instructor                  |
      | un participante inactivo       |

  Escenario: INS-06 Correo vacío o inválido
    Cuando el coordinador envía un correo vacío o "no-es-correo"
    Entonces responde 422 VALIDACION con fields.email y no se crea nada
    Y un correo con mayúsculas o espacios alrededor sí inscribe a la persona

  Escenario: INS-07 Recorrido con el backend real
    Dado la coordinadora del seed en el detalle de una clase real
    Cuando inscribe un correo inexistente, luego a María y luego a María otra vez
    Entonces ve «No encontramos un participante», luego Inscritos (1)
    Y al repetir ve «ya está inscrito(a)» y el contador sigue en 1
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| INS-01…06 | Integración (Postgres y Redis) | `backend/test/integracion/inscripcion.test.ts` |
| INS-07 | E2E real | `e2e/prb/real/inscripcion.spec.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas, antes de cambiar producción,
la integración dio 12 correctas y 2 en rojo por el comportamiento:

- INS-02: el 409 no indicaba desde cuándo estaba inscrita ni traía `details`.
- INS-06: `no-es-correo` respondía 404 (se buscaba en la base sin validar el formato).

INS-01, 03, 04 y 05 pasaron desde el inicio: la inscripción de HU-04, la clave
primaria y la matriz de T-04 ya los cumplían. Quedan como regresión. INS-07 (E2E
real) se escribió después del cambio y no se ejecutó en rojo.

**Verde.** Validación del formato del correo y 409 con el estado actual. También se
quitó la coma que `Intl` ponía en las fechas largas («martes, 6 de octubre»), que
afectaba al mensaje de conflicto de HU-04; PRG-05 e INS-02 ahora lo verifican.
Resultado: integración 66/66 en una copia aislada de Docker Compose; E2E real 13/13.
