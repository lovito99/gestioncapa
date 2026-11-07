# Pantallas del Figma: lo que el frontend espera del backend

T-23 referencia el [diseño institucional](https://www.figma.com/design/ORSusbg35vcu0nUEz4o08q).
La correspondencia entre ese original y la copia local sigue pendiente de validar.
Consultar [el alcance y las evidencias de T-23](reestructuracionCppp.md).

El frontend implementa estas pantallas usando la copia `Mz9MQ1XmFWJjqGVF4V2BQL` y las
prueba con datos simulados (MSW, `VITE_USE_MOCKS=true`). Este documento es el **contrato** que
falta implementar en el backend. Sigue las reglas generales de [API.md](../API.md): rutas bajo
`/api`, ids como texto, errores `{ code, message, fields?, details? }` con `message` en español.

| Qué | Tipos del cliente | Respuestas simuladas de referencia |
| --- | --- | --- |
| Registro | `frontend/src/types/api.ts` (`RegistroEntrada`) | `frontend/src/mocks/handlers.ts` |
| Cursos, sesiones y cierre | `frontend/src/servicios/cursos.ts` | `frontend/src/mocks/cursos.ts` |
| Clases como sesiones | `frontend/src/types/api.ts` (`Clase`, `ClaseEntrada`) | `frontend/src/mocks/handlers.ts` |
| Certificados | `frontend/src/servicios/certificados.ts` | `frontend/src/mocks/certificados.ts` |
| Historial | `frontend/src/servicios/historial.ts` | `frontend/src/mocks/historial.ts` |

Si una respuesta del backend difiere de los mocks, el cambio debe hacerse en los dos lados.

## 1. Registro de agremiados (1.2 · Crear cuenta)

| Método | Ruta | Quién | Cuerpo | Respuesta OK | Errores |
|---|---|---|---|---|---|
| POST | `/auth/registro` | público | `{ dni, nombres, apellidos, email, celular, password, aceptaPrivacidad: true }` | `201 { token, usuario }`, igual que el login | 422 `VALIDACION` con `fields` (`dni`, `celular`, `password`…), 409 `CUENTA_YA_REGISTRADA` |

- DNI: 8 dígitos. Celular: 9 dígitos y empieza con 9. Contraseña: 8 caracteres como mínimo.
- El usuario nuevo tiene rol `PARTICIPANTE` y queda con la sesión iniciada.
- `CUENTA_YA_REGISTRADA` cuando el DNI **o** el correo ya existen. El mensaje del Figma es
  «El DNI o el correo que ingresaste ya está registrado.»
- `aceptaPrivacidad` debe ser `true`; conviene guardar la fecha de aceptación (Ley N.° 29733).

## 2. Editar curso (2.2 / 2.3)

| Método | Ruta | Quién | Cuerpo | Respuesta OK | Errores |
|---|---|---|---|---|---|
| PUT | `/cursos/:id` | administrador | `CursoEntrada`; cada módulo es `{ id?, titulo }` | `200 DetalleCurso` | 422 `VALIDACION`, 404 |
| DELETE | `/cursos/:id/modulos/:moduloId/materiales/:materialId` | administrador o instructor asignado | — | `204` | 403, 404 |
| GET | `/cursos` | administrador, **coordinador**, instructor | — | `200 Curso[]` | — |

- **Módulos al editar:** un módulo con `id` conserva su material; uno sin `id` es nuevo; los que
  no se envían se eliminan. El orden del arreglo es el orden del curso.
- **Cupos:** no pueden quedar por debajo de los inscritos actuales (422).
- El coordinador necesita `GET /cursos` para elegir el curso de una clase (ver 3).
- **Por decidir:** el Figma (2.2) muestra al administrador agregando y quitando material, pero el
  texto de la misma pantalla dice «El material lo agrega el instructor asignado». Los mocks ya
  dejan al administrador agregar material; el backend hoy solo lo permite al instructor.

`Curso` y `DetalleCurso` suman estos campos:

```ts
estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO'   // CERRADO: nuevo, ver 4
requisitoAsistencia: number                      // % mínimo de sesiones; 80 por defecto
sesiones: SesionCurso[]                          // solo en DetalleCurso
// SesionCurso = { id, nombre, fecha, horaInicio, horaFin, lugar, estado: 'PROGRAMADA' | 'CANCELADA' }
```

## 3. Las clases son sesiones de un curso (3.2 · Nueva clase)

- `ClaseEntrada` suma **`cursoId` obligatorio**: 422 con `fields.cursoId` = «Selecciona el curso al
  que pertenece la clase» si falta, o si el curso no existe.
- `Clase` suma `curso: { id, titulo } | null` (`null` solo en clases antiguas).
- `DetalleCurso.sesiones` es la lista de clases con ese `cursoId`, ordenadas por fecha y hora.
- «Programar sesión» abre `/admin/clases/nueva?curso=<id>`; el frontend ya preselecciona el curso.
- **Migración:** las clases existentes no tienen curso. Hay que decidir si se asignan a mano o se
  quedan con `curso: null` (no cuentan para ningún certificado).

## 4. Cerrar curso y emitir certificados (2.4 · SCRUM-171)

| Método | Ruta | Quién | Cuerpo | Respuesta OK | Errores |
|---|---|---|---|---|---|
| GET | `/cursos/:id/cierre` | administrador | — | `200 CierreCurso` | 404, 409 `CURSO_NO_PUBLICADO`, 409 `CURSO_CERRADO` |
| POST | `/cursos/:id/cerrar` | administrador | `{ excepciones: [{ agremiadoId, motivo }] }` | `200 { emitidos }` | 409 (igual que arriba), 422 `VALIDACION` |

```ts
CierreCurso = { curso: DetalleCurso, requisitoAsistencia: number, filas: FilaCierre[] }
FilaCierre  = { agremiado: { id, nombre }, presentes, sesiones, porcentaje, cumple }
```

**Regla del 80 %:**

- `sesiones` = sesiones del curso con estado `PROGRAMADA` (las canceladas no cuentan).
- `presentes` = sesiones en las que el agremiado tiene asistencia registrada.
- `porcentaje` = `round(presentes / sesiones × 100)`.
- `cumple` = `sesiones > 0 && porcentaje >= requisitoAsistencia`.
- Las filas son **todos los inscritos del curso**.

**Cierre:**

- El cierre es **una sola transacción**: emite un certificado a cada inscrito que cumple más uno a
  cada excepción, y pasa el curso a `CERRADO`. Si algo falla, no se emite nada.
- Una excepción es válida solo si el agremiado está inscrito, **no** cumple y trae `motivo`.
  Si no, responde 422. Mensaje del Figma: «Ingresa el motivo de la excepción.»
- Se guarda quién emitió, cuándo y el motivo de cada excepción («Quedará registrado quién emitió
  la constancia, cuándo y el motivo.»). El motivo **no** sale en la verificación pública.
- Tipo de documento según `curso.tipoCertificado`: `PARTICIPACION` → constancia de participación;
  `APROBACION` → certificado de aprobación.
- Un curso `CERRADO` sale del catálogo y no acepta nuevas sesiones ni cierres.

## 5. Certificados del curso: anular y corregir (2.5 · SCRUM-171)

| Método | Ruta | Quién | Cuerpo | Respuesta OK | Errores |
|---|---|---|---|---|---|
| GET | `/cursos/:id/certificados` | administrador | — | `200 { curso, filas: FilaCertificado[] }` | 404, 409 `CURSO_NO_CERRADO` |
| POST | `/certificados/:codigo/anular` | administrador | `{ motivo }` | `204` | 422 (`fields.motivo`), 404 `CERTIFICADO_NO_EXISTE`, 409 `CERTIFICADO_NO_VIGENTE` |
| POST | `/certificados/:codigo/corregir` | administrador | `{ nombre, motivo }` | `201 { codigo }` (el nuevo) | 422 (`fields.nombre`, `fields.motivo`), 404, 409 `CERTIFICADO_NO_VIGENTE` |

```ts
FilaCertificado = {
  agremiado: { id, nombre }, cumple: boolean, porExcepcion: boolean,
  certificado: { codigo, estado: 'VALIDO' | 'ANULADO' | 'REEMPLAZADO', nombre } | null   // null = no emitido
}
```

- Cada fila muestra el certificado **vigente** del agremiado, o el último anulado. Los
  reemplazados no se muestran: en su lugar aparece el nuevo.
- **Anular:** el estado pasa a `ANULADO` y se guardan el motivo, el usuario y la fecha. Solo se
  puede anular un certificado `VALIDO`. Mensaje del Figma: «Ingresa el motivo de la anulación.»
- **Corregir:** el certificado actual pasa a `REEMPLAZADO`, con `reemplazadoPor` = el código nuevo.
  Se emite uno nuevo `VALIDO`, con el nombre corregido y los demás datos iguales. Se guarda el motivo.
- **Códigos:** formato `CPPP-XXXX-XXXX`, únicos. Los mocks usan letras y números sin `I`, `O`,
  `0` ni `1`, para que no se confundan al escribirlos.

## 6. Verificación pública y constancia (5.1–5.3b · SCRUM-138)

| Método | Ruta | Quién | Respuesta OK | Errores |
|---|---|---|---|---|
| GET | `/certificados/:codigo` | **público, sin sesión** | `200 CertificadoPublico` | 404 `CERTIFICADO_NO_EXISTE` |

```ts
CertificadoPublico = {
  codigo, estado: 'VALIDO' | 'ANULADO' | 'REEMPLAZADO', reemplazadoPor: string | null,
  tipo: 'PARTICIPACION' | 'APROBACION', nombre, dniEnmascarado: string | null,   // p. ej. "****1234"
  curso, modalidad, horasLectivas, fechaInicio, fechaFin, instructorNombre, emitidoEn
}
```

- El código se compara sin espacios y en mayúsculas.
- **No** devolver motivos, ids internos ni el DNI completo: es una ruta pública.
- El QR de la constancia lleva a `<frontend>/verificar/<codigo>`. La constancia (5.1) la dibuja el
  frontend en `/certificados/<codigo>` con estos mismos datos y se imprime como PDF.
- **Pendiente con el CPPP:** el nombre del decano que firma (el frontend usa el del Figma,
  «Dr. Juan Huillca Ochoa», en `frontend/src/lib/cppp.ts`).
- Conviene limitar las consultas por IP, para evitar que alguien pruebe códigos al azar.

## 7. Historial (4.1 / 5.1 · SCRUM-142, SCRUM-176)

- Cada curso de `GET /colegiados/:id/historial` suma `requisitoAsistencia`. Con ese dato, el
  frontend muestra «No obtuviste la constancia: tu asistencia fue 75 % y se necesita 80 %.»
  cuando el curso terminó sin certificado.
- Cada certificado del historial suma `estado: 'VALIDO' | 'ANULADO' | 'REEMPLAZADO'`. Un anulado
  se muestra pero **no suma horas** (HU-34, criterio 2). Los reemplazados no se envían: se envía
  el nuevo.
- Cada curso suma `pagoPendiente: boolean`: es `true` si el curso tiene costo y el pago no está
  confirmado (HU-16, criterio 4). Se muestra «Pendiente de pago» y la constancia queda retenida.
- «Horas de capacitación acumuladas» se calcula en el frontend: suma las horas de los cursos con
  certificado **válido** emitido en el año elegido. Cada curso suma una sola vez. Si el backend
  prefiere enviarlo calculado, hay que avisar para cambiar el frontend.
- La pantalla **«Mis cursos»** del agremiado (`/participante/cursos`) usa este mismo endpoint:
  muestra las inscripciones y «qué te falta» para la constancia, calculado con `sesiones`,
  `asistencia` y `requisitoAsistencia`.

## 8. Inscripción a un curso con costo (HU-16)

- `POST /cursos/:id/inscribirme` responde `estado: 'PENDIENTE_PAGO'` cuando el curso tiene costo.
  Si es gratuito, responde `estado: 'EN_CURSO'`. El frontend muestra «Inscripción pendiente de pago».

## 9. Datos de demostración con el lenguaje del CPPP (HU-35)

La interfaz ya no dice «organización» ni «coordinador». Lo que falta está en los datos, y lo
comparten la semilla del backend y las pruebas E2E, así que hay que cambiarlo **en los dos lados a
la vez**: los correos `@organizacion.pe` y la clase «Manejo de extintores» de la semilla, de
`frontend/src/mocks/datos.ts` y de `e2e/ayud/datos.ts`.

## Datos de prueba de los mocks

- **«Demo · Didáctica y evaluación»** reproduce el ejemplo del Figma: 6 inscritos y 4 sesiones.
  Cuatro agremiados cumplen el requisito y dos no (75 % y 50 %).
- **Códigos para verificar:** `CPPP-7K4M-Q9X2` (válido), `CPPP-2B6F-H8Z4` (anulado) y
  `CPPP-3H8R-T5N1` (reemplazado por `CPPP-9P2D-L6W3`).
- El DNI `45671234` simula una cuenta ya registrada.
