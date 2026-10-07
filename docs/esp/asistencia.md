# Especificación: HU-08 registrar asistencia y HU-09 lista de asistencia (backend real)

## Historias

- **HU-08.** Como participante inscrito quiero registrar mi asistencia escaneando el
  QR de la clase para que quede constancia de que asistí.
- **HU-09.** Como coordinador quiero ver la lista de asistencia de una clase para
  comprobar quién asistió.

Con estas rutas, todas las pantallas de la interfaz funcionan contra el backend real
(`VITE_USE_MOCKS=false`): ya no queda ninguna ruta del contrato en 501.

## Alcance y decisiones

- **`POST /api/asistencia/marcar`** `{ token, claseId? }`, solo participante (matriz
  de T-04). El cuerpo se valida con Zod. Las validaciones siguen este orden, con los
  mensajes de la simulación MSW:

  | Caso | Status | `code` |
  |---|---|---|
  | Token ausente, mal formado o con firma inválida | 422 | `QR_INVALIDO` |
  | Token vencido (fuera de su ventana de 30 s) | 410 | `QR_EXPIRADO` |
  | `claseId` enviado y distinto de la clase del token | 409 | `QR_OTRA_CLASE` |
  | La clase del token no existe | 404 | `CLASE_NO_EXISTE` |
  | La clase está cancelada | 409 | `CLASE_CANCELADA` |
  | El participante no está inscrito | 403 | `NO_INSCRITO` |
  | Ya registró asistencia en esa clase | 409 | `ASISTENCIA_YA_REGISTRADA` (con la hora) |

  Si todo es correcto: 201 `{ clase: { id, nombre }, horaRegistro }`.
- **Anti-duplicado atómico.** La inserción usa la restricción UNIQUE de
  `attendances` (`on conflict do nothing`): dos escaneos simultáneos crean un solo
  registro y el otro recibe `ASISTENCIA_YA_REGISTRADA`.
- **Actor y momento.** Cada asistencia guarda `created_by` (quien la registró, aquí
  el propio participante) y `timestamp_lima`. `horaRegistro` se devuelve en ISO 8601
  con la zona de Lima (`-05:00`).
- **Reloj.** El vencimiento usa el mismo reloj del servidor que emite el QR (HU-07).
- **`GET /api/clases/:id/asistencia`**, solo coordinador:
  `{ inscritos, presentes, ausentes, registros: [{ participante: { id, nombre, email }, estado, horaRegistro }] }`,
  con todos los inscritos (`PRESENTE` con su hora o `AUSENTE` con `null`), ordenados por
  nombre. Clase inexistente: 404.
- **`GET /api/participante/clases`**, solo participante: las clases en las que está
  inscrito, con `miAsistencia` (ISO o `null`). No incluye datos de otros participantes
  ni el número de inscritos.
- Fuera de alcance: limitar el registro a la hora de la clase (no lo pide el
  contrato del Sprint 1) y la lectura física con cámara.

## Criterios de aceptación

```gherkin
# language: es
Característica: Registrar y consultar asistencia

  Antecedentes:
    Dado una clase programada de Carlos con María inscrita y Luz sin inscribir

  Escenario: MAR-01 Registro con QR vigente
    Cuando María envía el token vigente de la clase
    Entonces responde 201 con la clase y horaRegistro en hora de Lima
    Y queda una asistencia con created_by = María y timestamp_lima

  Escenario: MAR-02 Asistencia repetida
    Dado que María ya registró su asistencia
    Cuando vuelve a enviar un token vigente
    Entonces responde 409 ASISTENCIA_YA_REGISTRADA con la hora original
    Y sigue habiendo un solo registro

  Escenario: MAR-03 Escaneos simultáneos
    Cuando María envía cinco veces a la vez el mismo token
    Entonces una respuesta es 201, las demás 409, y hay un solo registro

  Esquema del escenario: MAR-04 Rechazos
    Cuando se envía <caso>
    Entonces responde <status> <code> y no se crea ningún registro

    Ejemplos:
      | caso                                      | status | code              |
      | un cuerpo sin token                       | 422    | QR_INVALIDO       |
      | un token con la firma alterada            | 422    | QR_INVALIDO       |
      | un token de la ventana anterior (vencido) | 410    | QR_EXPIRADO       |
      | un token válido con claseId de otra clase | 409    | QR_OTRA_CLASE     |
      | el token de una clase cancelada           | 409    | CLASE_CANCELADA   |
      | el token válido enviado por Luz           | 403    | NO_INSCRITO       |

  Escenario: MAR-05 Solo participantes registran asistencia
    Cuando el instructor o el coordinador llaman a /asistencia/marcar
    Entonces reciben 403 SIN_PERMISO

  Escenario: LIS-01 Lista de asistencia
    Dado otra clase con María y Luz inscritas, donde solo María registró asistencia
    Cuando el coordinador consulta la asistencia de esa clase
    Entonces ve 2 inscritos, 1 presente y 1 ausente
    Y Luz figura AUSENTE con horaRegistro null y María PRESENTE con su hora

  Escenario: LIS-02 Solo el coordinador ve la lista
    Cuando el instructor o un participante la consultan
    Entonces reciben 403; una clase inexistente responde 404

  Escenario: PAR-01 Clases del participante
    Cuando María consulta sus clases
    Entonces ve solo las clases en las que está inscrita, con miAsistencia
    Y no ve datos de otros participantes

  Escenario: VIN-01 Flujo completo con el backend real (casos de demo)
    Dado la coordinadora crea una clase e inscribe a María
    Cuando Carlos muestra el QR y María abre el enlace del QR en su sesión
    Entonces María ve «¡Asistencia registrada!» y su clase muestra la hora
    Y si repite el enlace ve que ya estaba registrada
    Y la coordinadora ve a María como Presente en la lista de asistencia
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| MAR-01…05, LIS-01…02, PAR-01 | Integración (Postgres y Redis) | `backend/test/integracion/asistencia.test.ts` |
| VIN-01 | E2E real | `e2e/prb/real/asistencia.spec.ts` |

## Ciclo aplicado (7 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas, antes de cambiar producción.
El primer intento falló por un error de la prueba: la clase de las 08:00 calculaba su
fin como `9:00` en vez de `09:00` y el servidor la rechazaba (correctamente). Corregida
la prueba, la integración dio **13 en rojo por comportamiento** (las tres rutas
respondían 501) y 2 correctas (MAR-05: la matriz de T-04 ya exigía el rol).

**Verde.** Módulo `backend/src/modules/asistencia/` con validación Zod, anti-duplicado
atómico por la restricción UNIQUE y la hora de Lima en ISO. Resultado: unitarias del
backend 127/127; integración 109/109 en una copia aislada de Docker Compose; E2E real
16/16. VIN-01 falló primero por la prueba (escribía el correo antes de terminar la
navegación al login tras cerrar sesión); se añadió la espera y pasó.

## Corrección de concurrencia (7 de octubre de 2026)

MAR-06 reproduce una cancelación confirmada mientras el escaneo espera a la base;
MAR-07 reproduce un QR que vence durante esa espera. El servicio de asistencia
bloquea la clase en una transacción, comprueba la inscripción y vuelve a validar el
QR antes de insertar. Los rechazos son 409 `CLASE_CANCELADA` y 410 `QR_EXPIRADO`,
sin nuevas asistencias. La respuesta 201 se envía después del commit.

`npm run test:cobertura` exige al menos 60 % de líneas, ramas y funciones del
módulo de asistencia. Las pruebas usan Postgres y Redis; pueden ejecutarse
contra una base de pruebas, sin compilar la aplicación.
