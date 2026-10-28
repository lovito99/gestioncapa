# HU-18: Historial del colegiado

El colegiado abre **Mi historial** y consulta sus cursos en curso y terminados,
la asistencia por sesión, los porcentajes y los certificados emitidos. Puede
descargar el resumen en PDF y cada certificado disponible.

El administrador abre **Historiales**, busca por nombre y selecciona al colegiado.
La consulta se limita a su organización. Otro colegiado, un instructor o un
coordinador no pueden acceder a un historial ajeno, incluido su PDF y archivos.
Las respuestas de datos y descargas utilizan `Cache-Control: private, no-store`.

## Datos y reglas

La migración `0008-historialColegiado.sql` incorpora:

- DNI opcional de ocho dígitos en el usuario. La API de historial y el resumen PDF
  solo exponen los cuatro últimos (`****5678`). Si falta, muestran «No registrado».
- Inscripciones a cursos con estado `EN_CURSO` o `TERMINADO`, fechas de inscripción
  y finalización. El estado es de la inscripción del colegiado, no de la publicación.
- Relación opcional entre clases/sesiones y cursos, conservando las clases previas.
- Archivos de certificados ya emitidos, asociados a una inscripción y un propietario.

Esta historia consulta esos datos. No implementa la inscripción/pago de cursos,
la evaluación ni la emisión oficial de certificados; no concede certificados
por descargar un resumen o por consultar un curso. Los procesos que escriban
inscripciones y sesiones deben validar que pertenecen a la misma organización.

El historial utiliza las asistencias QR persistidas en `attendances`.
Porcentaje = presentes / sesiones iniciadas × 100, redondeado a dos decimales.
El reloj de referencia es el servidor, en `America/Lima`. Las futuras y canceladas
no se cuentan. Si no hay sesiones iniciadas, el porcentaje es `null` y se muestra
«Sin sesiones realizadas». Una sesión iniciada sin registro se muestra «Ausente»;
una futura sin registro, «Pendiente». No se duplica la sesión al calcular el total.

La sección **Otras sesiones de capacitación** conserva inscripciones a clases
independientes o clases vinculadas a un curso sin inscripción del colegiado a
ese curso. Así no desaparece asistencia histórica durante una transición del modelo.

Solo se presentan certificados almacenados para ese usuario y curso. La descarga
comprueba tanto la identidad del solicitante como el propietario del archivo y
su organización. Un identificador de certificado de otro usuario no basta para
obtenerlo. No se envían los bytes del certificado dentro del JSON del historial.

El resumen PDF incluye nombre y DNI enmascarado, cursos, fechas, asistencia y
referencias de certificados. Excluye correo, DNI completo, credenciales y tokens.
Tiene texto seleccionable en español y varias páginas para historiales extensos.
No reemplaza un certificado emitido.

## API y pantallas

| Método | Ruta bajo /api | Acceso |
| --- | --- | --- |
| GET | /colegiados | Admin: nombres, identificadores y DNI enmascarado de su organización |
| GET | /colegiados/:usuarioId/historial | Colegiado propietario o admin de su organización |
| GET | /colegiados/:usuarioId/historial/pdf | Igual; PDF descargable |
| GET | /colegiados/:usuarioId/certificados/:certificadoId/archivo | Igual; certificado propio del historial |

Sin autenticación: 401. Historial ajeno o de otra organización: 403.
Identificador inválido o recurso inexistente autorizado: 404.

La respuesta contiene `colegiado`, `generadoEn`, `cursos`,
`sesionesIndependientes` y `asistenciaGeneral`. Cada curso incluye sus sesiones,
resumen de asistencia y metadatos de certificados.

Pantallas: `/historial` (propio), `/historial/:usuarioId` (acceso por objeto) y
`/admin/historial` (selección por administrador).

## Datos demo complementarios

Aplicar migraciones y ejecutar `npm run seed`. Solo fuera de producción:

- María (`maria.quispe@demo.pe` / `demo123`) tiene Seguridad y primeros auxilios
  terminado con asistencia del 50 % y un certificado **DEMO sin validez oficial**;
  Didáctica y evaluación está en curso, con una sesión asistida y otra futura.
- Luz (`luz.apaza@demo.pe` / `demo123`) tiene Seguridad y primeros auxilios en
  curso, con un registro de asistencia y sin certificado.
- Los DNI de ambas cuentas son ficticios y se asignan solo si no tienen uno.
- Se agregan cuatro sesiones de cursos, además de las cinco clases demo previas.
  El seed conserva estados, documentos, fechas y cambios ya guardados.

En modo demo MSW están disponibles los mismos casos. Las asistencias de las
clases independientes se consultan desde los datos de la simulación. Al recargar,
la simulación recupera sus valores iniciales; PostgreSQL conserva los cambios.

## Verificación

- Unitarias: máscara de DNI, porcentaje, PDF con caracteres españoles, paginación
  y referencias válidas.
- Integración PostgreSQL: cursos en ambos estados, sesiones, porcentajes, vacío,
  datos mínimos, permisos de JSON/PDF/certificados, HEAD y aislamiento organizacional.
- E2E real y demo a 360 px: historial, descargas, bloqueo a otro colegiado y consulta
  por administrador.
- El PDF también puede inspeccionarse con `pdftotext` para validar texto y paginación.

```bash
npm run typecheck
npm run e2e:tipos
npm test
# Desde backend/, con la base de pruebas preparada:
NODE_ENV=test DB_NAME=gestioncapa_e2e node --import tsx --test test/integracion/historial.test.ts
# Desde raíz, por separado de cualquier prueba que use la misma base:
npm exec -- playwright test --config playwright.real.config.ts e2e/prb/real/historial.spec.ts
npm exec -- playwright test e2e/prb/demo/historial.spec.ts --project=movil
```

El preparador E2E reinicia clases exclusivamente en `gestioncapa_e2e` y después
carga los datos demo, incluidos cursos e historial. No usar esa base en paralelo
para otras pruebas. El build queda para ejecución manual del usuario.
