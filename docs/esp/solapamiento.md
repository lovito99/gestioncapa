# Especificación: HU-05 evitar solapamiento de instructor

## Historia

Como coordinador, quiero que el sistema detecte conflictos de horario de un
instructor, para no asignarlo a dos clases simultáneas.

## Alcance y decisiones

- La regla ya existe desde HU-04 ([programar](programar.md), PRG-05). Esta historia
  la especifica completa, la prueba en todos sus bordes y garantiza que se cumple
  también con peticiones simultáneas.
- **Regla.** Dos clases se solapan si son del **mismo instructor**, el **mismo día**,
  ambas están `PROGRAMADA` y `inicioA < finB` y `inicioB < finA`. Los intervalos
  son semiabiertos `[inicio, fin)`: si una termina cuando empieza la otra, **no**
  se solapan. Las horas son locales de Lima.
- **Respuesta.** 409 `CONFLICTO_HORARIO`, con un mensaje que nombra al instructor,
  la clase existente, su fecha y su horario, y `details.claseId`. No se crea ni se
  modifica nada. La interfaz lo muestra como «Conflicto de horario».
- **Concurrencia.** Crear o editar bloquea la fila del instructor durante la
  transacción: dos solicitudes simultáneas que se cruzan no pueden aceptarse ambas.
- **Seed.** Se añade una segunda instructora, Lucía Paredes Quispe
  (`lucia.paredes@organizacion.pe` / `demo123`, la misma que en el modo demo), para
  probar el caso de instructor diferente.

## Criterios de aceptación

```gherkin
# language: es
Característica: Evitar solapamiento de instructor

  Antecedentes:
    Dado un coordinador autenticado
    Y el instructor Carlos tiene una clase programada el 2031-04-07 de 10:00 a 11:00

  Escenario: SOL-01 Cruce parcial con el mismo instructor
    Cuando intenta asignar a Carlos otra clase el mismo día de 10:30 a 11:30
    Entonces el servidor responde 409 CONFLICTO_HORARIO
    Y el mensaje nombra a Carlos, la clase existente y el horario 10:00 a 11:00
    Y no se crea la clase

  Escenario: SOL-02 Misma solicitud con otro instructor
    Cuando asigna a Lucía la clase de 10:30 a 11:30 del mismo día
    Entonces se acepta (201)

  Escenario: SOL-03 Clases contiguas
    Cuando asigna a Carlos una clase de 11:00 a 12:00
    Y otra de 09:00 a 10:00
    Entonces ambas se aceptan

  Esquema del escenario: SOL-04 Otras formas de solapamiento
    Cuando asigna a Carlos una clase de <inicio> a <fin> el mismo día
    Entonces el servidor responde 409 CONFLICTO_HORARIO

    Ejemplos:
      | inicio | fin   | caso                        |
      | 10:00  | 11:00 | mismo horario               |
      | 09:00  | 12:00 | la nueva contiene a la otra |
      | 10:15  | 10:45 | la nueva está dentro        |
      | 09:30  | 10:30 | cruce por el inicio         |

  Escenario: SOL-05 Mismo horario en otro día
    Cuando asigna a Carlos una clase de 10:00 a 11:00 el día siguiente
    Entonces se acepta

  Escenario: SOL-06 Editar hasta provocar un cruce
    Dado otra clase de Carlos de 12:00 a 13:00 el mismo día
    Cuando se edita para que sea de 10:30 a 11:30
    Entonces responde 409 y la clase conserva su horario de 12:00 a 13:00
    Y si se edita cambiando el instructor a Lucía en ese horario, se acepta

  Escenario: SOL-07 Solicitudes simultáneas
    Cuando dos coordinadores envían a la vez dos clases de Carlos que se cruzan
    Entonces exactamente una se acepta y la otra recibe 409

  Escenario: SOL-08 Recorrido con el backend real
    Dado la coordinadora del seed en el navegador y una clase de Carlos creada
    Cuando programa otra clase en el mismo horario con Lucía
    Entonces se guarda y ambas aparecen en la lista
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| SOL-01…07 | Integración (Postgres y Redis) | `backend/test/integracion/solapamiento.test.ts` |
| SOL-02 (seed) | Unitaria | `backend/test/usuarios-seed.test.ts` |
| SOL-08 | E2E real | `e2e/prb/real/solapamiento.spec.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas, antes de cambiar producción:

- SOL-02 (unitaria e integración) y SOL-06 fallaron por el motivo esperado: el
  seed tenía un solo instructor, así que no existía «otro instructor».
- SOL-01, 03, 04, 05 y 07 pasaron desde el inicio: la regla de HU-04 ya cubría los
  bordes y el bloqueo por instructor ya resolvía 5 solicitudes simultáneas
  (una 201, cuatro 409). Quedan como pruebas de regresión, no como TDD.
- SOL-08 (E2E real) se escribió junto con el cambio del seed y no se ejecutó en rojo.

**Verde.** Se añadió Lucía Paredes Quispe al seed. Resultado: unitarias del backend
107/107; integración 63/63 en una copia aislada de Docker Compose; E2E real 13/13.
