# Ajustes según el proceso de desarrollo de GestionCapa

Fecha: 7 de octubre de 2026. Referencia: «Proceso de desarrollo del proyecto», versión 2.1 del 03/10/2026, proporcionado por el usuario.

## Alcance aplicado

El incremento del Sprint 1 comprende HU-01 a HU-10 y T-01 a T-07: sesión, autorización por rol, clases presenciales, solapamiento, inscripciones, QR rotativo y asistencia. El contexto del documento describe el estado inicial; el repositorio ya contiene esos módulos y sus tablas.

El administrador conserva el acceso a la gestión de clases, inscripciones, asistencia y QR solicitado expresamente por el usuario. Coordinador, instructor y participante acceden a las acciones de su rol y el servidor valida los permisos.

Cursos, progreso, exámenes, certificados, proveedores externos, suscripciones y aislamiento completo por organización figuran en el roadmap posterior. No se introducen tablas ni funciones para requisitos que ese documento deja pendientes de definir.

## Correspondencia con el incremento

| Requisito | Implementación y evidencia |
|---|---|
| HU-01 y HU-02: entrar y salir | Login con bcrypt 12 y JWT; cierre de sesión local y API. `backend/test/integracion/roles.test.ts` y `e2e/prb/real/entrada.spec.ts`. |
| HU-03: permisos por rol | Matriz en `backend/src/plugins/permisos.ts`, guard en el servidor y navegación de los cuatro roles. Pruebas de permisos y roles. |
| HU-04 y HU-05: clases y solapamiento | Validación Zod; bloqueo del instructor al crear o editar; horarios contiguos permitidos. `backend/test/integracion/clases.test.ts` y `solapamiento.test.ts`. |
| HU-06: inscripciones | Usuario participante activo, inscripción única y bloqueo de clase durante la transacción. `backend/test/integracion/inscripcion.test.ts`. |
| HU-07: QR rotativo | Firma HMAC, ventanas de 30 segundos y autorización para el instructor asignado o administrador. `backend/test/integracion/qr.test.ts`. |
| HU-08: registro de asistencia | Servicio transaccional, rechazo de QR alterado, expirado, de otra clase, clase cancelada, no inscrito y duplicado. Actor y hora de Lima persistidos. `backend/test/integracion/asistencia.test.ts`. |
| HU-09: lista de asistencia | Inscritos, presentes, ausentes y hora; el participante consulta solo sus clases y su registro. Pruebas LIS y PAR. |
| HU-10: experiencia móvil | Navegación adaptable y escáner con mensajes de cámara. Recorridos de Playwright en escritorio y celular; la cámara de un dispositivo físico requiere prueba manual. |
| T-07: base versionada | `organizations`, `users`, `classes`, `enrollments`, `attendances` y registro de migraciones ya implementados. Integración de migraciones verifica creación, restricciones, índices y conservación de datos antiguos. |
| Calidad y cobertura | Tipos, pruebas unitarias, integración y recorridos reales. `npm run test:cobertura` exige 60 % de líneas, ramas y funciones de asistencia; el CI aplica el mismo umbral. |

## Correcciones realizadas

- Errores de API uniformes en español, incluyendo validación Zod, JSON incompleto, rutas inexistentes y fallos internos. El navegador no recibe detalles internos del servidor.
- Validación Zod de clases e inscripciones: textos, fechas reales, horas, límite de 160 caracteres e identificadores positivos. El login también devuelve errores por campo.
- Servicio de asistencia separado de las rutas. La transacción bloquea la clase, comprueba la inscripción y vuelve a validar el QR antes de insertar. La respuesta de éxito se envía después del commit.
- Formularios con reintento cuando no se pudieron cargar los instructores y límites de texto consistentes con el backend.
- Contexto de sesión y hook en archivos separados para eliminar la advertencia de recarga del frontend.
- Funciones nuevas en camelCase, sin guiones bajos. Las migraciones nuevas se generan como `NNNN-descripcionEnCamelCase.sql`. El historial y las columnas SQL existentes se conservan para no romper bases ya migradas.

## Evidencia de TDD

Las pruebas VAL-01 a VAL-05 reprodujeron los errores de API y el identificador cero aceptado. MAR-06 y MAR-07 devolvieron 201 antes del cambio, aunque la clase se había cancelado o el QR había vencido durante la espera. Después de la corrección responden 409 y 410, respectivamente, sin insertar asistencias.

BD-12 reprodujo que el generador usaba guiones bajos y no continuaba la numeración de nombres nuevos. Ahora lee ambos formatos y crea nombres camelCase sin guiones bajos.

Las salidas locales se conservan en los registros de pruebas de esta sesión; en CI quedan en los jobs de calidad. No se inventan commits, aprobaciones ni un ciclo de revisión humana que aún no haya ocurrido.

## Resultados locales

Verificación del 07/10/2026 con Node 24, sin ejecutar la compilación local:

| Comprobación | Resultado |
|---|---|
| Tipos de backend, frontend y pruebas E2E | Sin errores. |
| Pruebas unitarias | 134 de backend y 17 de frontend aprobadas. |
| Integración con PostgreSQL y Redis | 110 aprobadas, en una base de pruebas separada. |
| Navegación con API real | 18 aprobadas: cuatro roles, gestión administrativa, QR, asistencia, sesión y validación. |
| Clases y navegación con API simulada | 20 aprobadas, repartidas entre escritorio y móvil. |
| Cobertura del módulo de asistencia | Líneas: 99,47 %; ramas: 92,16 %; funciones: 100 %. |
| Lint de frontend | Sin errores ni advertencias. |

La ejecución final del navegador usó un solo worker, sin vídeo ni trazas, por la memoria disponible del equipo. No se cuentan como aprobadas las ejecuciones anteriores interrumpidas por falta de recursos.

## Verificación pendiente de la Review

La compilación local queda manualmente a cargo del usuario. El CI conserva el paso de compilación requerido por la DoD. Antes de declarar una historia «Hecho» en Jira, el equipo registra su PR, aprobación de otro Developer, aceptación de la PO y demostración en un celular físico. El tiempo de confirmación de ese dispositivo debe comprobarse contra el KPI de 10 segundos; un navegador emulado no sustituye esa evidencia.

## Registro de apoyo de IA

- Fecha y herramienta: 07/10/2026, OpenAI Codex.
- Propósito: comparar el documento con el repositorio, corregir validaciones, errores y concurrencia; verificar rutas, base de datos y cobertura.
- Contexto: documento adjunto, instrucciones del usuario y código existente. Se conserva la compilación manual solicitada.
- Cambios: implementación y pruebas descritas arriba, disponibles para revisión en el diff local.
- Revisor y decisión final del equipo: pendientes de registrar en la tarea o PR correspondiente. Este registro no sustituye una aprobación humana.
