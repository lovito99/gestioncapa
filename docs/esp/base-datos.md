# Especificación: T-07 base de datos del Sprint 1

## Tarea

Crear el modelo de datos y las migraciones que necesitan las historias del
Sprint 1. Cada cambio de la base queda versionado y se aplica con `npm run migrate`.

## Alcance y decisiones

### Migraciones versionadas

- Cada cambio de esquema es un archivo SQL en `backend/migraciones/` con el nombre
  `NNNN-descripcionEnCamelCase.sql` (4 dígitos, sin guiones bajos). Ejemplo:
  `0005-indiceDeAsistencia.sql`. Se crea con `npm run migrate:nueva -- indice de asistencia`.
  Los archivos anteriores se siguen leyendo con su nombre original para conservar el historial.
- `npm run migrate` aplica en orden las migraciones pendientes. Cada una corre en
  su propia transacción: si falla, no queda a medias y las siguientes no se aplican.
- La tabla `schema_migrations` registra versión, nombre, checksum SHA-256 y fecha.
  `npm run migrate:estado` muestra las aplicadas y las pendientes.
- **Una migración aplicada no se edita**: si su contenido cambia (checksum distinto),
  `migrate` se detiene y nombra el archivo. Un cambio nuevo va en una migración nueva.
- También se detiene si falta el archivo de una migración aplicada, si dos archivos
  comparten versión o si aparece una versión menor que la última aplicada (por
  ejemplo, dos ramas que crearon el mismo número): hay que renumerar la nueva.
- Un bloqueo consultivo de Postgres impide que dos `migrate` simultáneos apliquen
  la misma migración dos veces.
- **El servidor no migra solo.** Al arrancar verifica que no haya migraciones
  pendientes; si las hay, no acepta tráfico y pide ejecutar `npm run migrate`
  (mismo criterio que la validación de variables, CFG-01). La preparación E2E
  (`npm run e2e:prep`) sí migra su base de pruebas.

### Modelo

Los nombres de las tablas siguen la tarea en inglés; las columnas de negocio
conservan los nombres en español que ya usa el contrato (`fecha`, `hora_inicio`…).

| Tabla | Columnas principales | Restricciones e índices |
|---|---|---|
| `organizations` | `id`, `name` | Fila demo fija `id = 1` («Organización demo») |
| `users` | `id`, `organization_id`, `name`, `email`, `password_hash`, `role`, `active` | `email` UNIQUE; índice por `organization_id` |
| `classes` | `id`, `organization_id`, `nombre`, `instructor_id`, `fecha`, `hora_inicio`, `hora_fin`, `lugar`, `estado` | CHECK `hora_fin > hora_inicio`; CHECK de `estado`; índices `(instructor_id, fecha)` y `(organization_id, fecha)` |
| `enrollments` | `id`, `organization_id`, `class_id`, `user_id`, `created_at` | **UNIQUE `(class_id, user_id)`**; índice por `user_id` |
| `attendances` | `id`, `organization_id`, `class_id`, `user_id`, `timestamp_lima`, `created_by`, `created_at` | **UNIQUE `(class_id, user_id)`**; FK `(class_id, user_id)` → `enrollments`: solo un inscrito puede tener asistencia; índice por `user_id` |

- `organization_id` existe desde el inicio en todas las tablas, `not null`, con
  valor por defecto `1` (organización demo) y FK a `organizations`.
- `fecha` (`date`) y `hora_inicio`/`hora_fin` (`time`) son locales de Lima.
  `timestamp_lima` es `timestamp` **sin zona** con la hora local de Lima
  (Perú no tiene horario de verano); por defecto, el momento de la inserción en Lima.
  `created_by` es quien registró la asistencia (participante por QR o coordinador).
- Las reglas de unicidad viven en la base: aunque el código falle, Postgres
  rechaza el duplicado (error `23505`).

### Bases existentes

La migración `0003` convierte las tablas creadas antes de T-07 (`clases`,
`inscripciones`): copia sus filas a `classes` y `enrollments`, conserva los ids y
borra las tablas antiguas. `0001` crea `users` solo si no existe.

## Criterios de aceptación

```gherkin
# language: es
Característica: Base de datos versionada del Sprint 1

  Escenario: BD-01 Migrar una base vacía
    Dado una base de datos vacía
    Cuando se ejecuta npm run migrate
    Entonces se aplican todas las migraciones en orden y quedan en schema_migrations
    Y ejecutarlo otra vez no aplica nada

  Escenario: BD-02 Tablas y columnas de la tarea
    Dado la base migrada
    Entonces existen classes, enrollments y attendances con las columnas de la tarea
    Y organization_id es obligatorio y vale 1 por defecto en todas las tablas

  Escenario: BD-03 UNIQUE de inscripciones en la base
    Cuando se inserta dos veces la misma (class_id, user_id) directamente por SQL
    Entonces Postgres rechaza la segunda con 23505

  Escenario: BD-04 UNIQUE y coherencia de asistencias en la base
    Cuando se inserta dos veces la misma asistencia directamente por SQL
    Entonces Postgres rechaza la segunda con 23505
    Y una asistencia de alguien no inscrito se rechaza con 23503

  Escenario: BD-05 Índices
    Entonces existen los índices de la tabla del modelo

  Escenario: BD-06 Actualizar una base anterior a T-07
    Dado una base con las tablas clases e inscripciones y datos
    Cuando se ejecuta npm run migrate
    Entonces los datos están en classes y enrollments con los mismos ids
    Y las tablas antiguas ya no existen
    Y una clase nueva recibe un id mayor que los copiados

  Escenario: BD-07 Una migración aplicada no se edita
    Dado una migración ya aplicada cuyo archivo cambió
    Cuando se ejecuta npm run migrate
    Entonces falla nombrando el archivo modificado y no aplica nada

  Escenario: BD-08 Orden y nombres de archivo
    Entonces migrate rechaza nombres inválidos, versiones repetidas, versiones
      menores que la última aplicada y migraciones aplicadas sin archivo

  Escenario: BD-09 Migraciones simultáneas
    Cuando dos procesos ejecutan migrate a la vez sobre una base vacía
    Entonces ambos terminan sin error y cada migración se aplica una sola vez

  Escenario: BD-10 El servidor no arranca con migraciones pendientes
    Dado una base con migraciones pendientes
    Cuando el servidor arranca
    Entonces se detiene con un mensaje que lista las pendientes y pide npm run migrate

  Escenario: BD-11 Crear una migración nueva
    Cuando se ejecuta npm run migrate:nueva -- agregar campo
    Entonces se crea backend/migraciones/NNNN-agregarCampo.sql con el siguiente número
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| BD-07 (planificación), BD-08, BD-11 | Unitaria | `backend/test/migraciones.test.ts` |
| BD-01…07, BD-09, BD-10 | Integración (base temporal propia) | `backend/test/integracion/migraciones.test.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas, la suite falló porque no
existía el motor de migraciones (`src/shared/migraciones.ts`). Un caso de BD-08
siguió en rojo tras implementarlo por la redacción del mensaje («renumera») y se
ajustó el mensaje. Las pruebas de integración BD no se ejecutaron en rojo aparte:
importan el mismo módulo inexistente.

**Verde.** Cuatro migraciones (`0001`…`0004`), `npm run migrate`, `migrate:estado`
y `migrate:nueva`; el servidor y el seed verifican y no migran solos; el código usa
`classes` y `enrollments`. Resultado: unitarias del backend 118/118; integración
86/86 en una copia aislada de Docker Compose, con bases temporales propias para
BD-01…10; E2E real 14/14. La base `gestioncapa_e2e` real, que tenía las tablas
antiguas `clases` e `inscripciones`, se actualizó sin errores (BD-06 en la práctica).
La versión compilada (`dist/`) encuentra la carpeta de migraciones.
