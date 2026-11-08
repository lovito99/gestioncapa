# HU-35 · Roles y entidad única del CPPP

La plataforma pertenece al CPPP Región Cusco. Ya no permite seleccionar una
organización ni separar usuarios o cursos por organizaciones.

| Rol | Acceso |
| --- | --- |
| Agremiado | Catálogo publicado, inscripciones propias, historial y certificados propios, registro de asistencia |
| Instructor | Cursos y sesiones asignadas, material de sus módulos, QR y asistencia de sus sesiones |
| Administrador | Usuarios, roles, cursos, sesiones, inscripciones y certificados del CPPP |

La API usa `ADMIN`, `INSTRUCTOR`, `AGREMIADO` en la sesión y sus equivalentes en
minúsculas en PostgreSQL. Cada petición lee el rol y el estado activo de la base;
el rol guardado en un JWT antiguo no concede permisos. La matriz de permisos
rechaza con 403 las rutas administrativas solicitadas por otros roles.

El instructor no puede leer cursos ajenos ni listas de asistencia o QR de otras
sesiones. El agremiado no puede consultar historiales o archivos privados ajenos.
Las reuniones mantienen sus comprobaciones de anfitrión/inscripción; el término
«participante» dentro de una reunión describe una función de la sala, no un rol
de usuario del sistema.

La gestión de usuarios incluye creación con bcrypt, edición, cambio de rol y
desactivación. Requiere motivo y registra usuario afectado, actor y fecha en
`auditoriaRoles`. El administrador no puede desactivarse o quitarse su propio
rol. Las escrituras administrativas sobre usuarios se serializan y vuelven a
validar al actor para evitar cambios de rol concurrentes con permisos obsoletos.

## Migraciones y conservación

- `0014-rolesCppp.sql`: registra la conversión, transforma coordinadores en
  administradores y participantes en agremiados; limita los roles a los tres del CPPP.
- `0015-entidadUnicaCppp.sql`: retira `organizations` y las columnas
  `organization_id` de usuarios, cursos, sesiones, inscripciones y asistencias.
  Reconstruye la relación de sesión/curso por su identificador.
- `0016-demoCppp.sql`: actualiza los correos conocidos de demostración y sustituye
  la sesión/reunión de extintores por evaluación docente, conservando sus claves.
- `0017-cursosPedagogicosDemo.sql`: adapta las sesiones de atención a la diversidad
  y liderazgo pedagógico manteniendo sus identificadores.

No se editan migraciones aplicadas. Las claves de usuarios, cursos, sesiones,
inscripciones y asistencias permanecen; los datos antes separados pasan a formar
parte del único CPPP. El administrador puede gestionarlos globalmente. No se
eliminan inscripciones ni asistencias para consolidar la entidad.

La conversión de correos demo falla por la restricción de unicidad si ya existe
una cuenta con el correo destino: no fusiona personas ni borra sus historiales.
Debe resolverse el conflicto de identidad antes de repetir la migración.

## Ejecución manual y reversión

Este cambio de contrato requiere despliegue coordinado con una ventana de
mantenimiento. Antes de migrar, el responsable debe respaldar la base y comprobar
la restauración en una base aislada. Detener las instancias del código anterior,
aplicar `npm run migrate` y arrancar el código actualizado después del build
manual. No es compatible ejecutar el backend anterior tras retirar columnas.

Las migraciones se aplican transaccionalmente: un fallo revierte el archivo.
Después de confirmar la retirada de columnas, la reversión consiste en restaurar
el respaldo y el código anterior conjuntamente; no se reconstruyen asignaciones
de organizaciones que ya no existen. Esta entrega no ejecuta migraciones ni
restauraciones sobre la base de trabajo o producción.

Se conservan algunas rutas históricas `/participante/...`, códigos de error y
carpetas de componentes como contratos internos; no habilitan el rol retirado.
Las pantallas y las cuentas de demostración usan las etiquetas del CPPP.

## Verificación

La prueba de migración usa un esquema aislado con usuarios de los roles
anteriores, un curso, una sesión, una inscripción y asistencia: comprueba los
mismos identificadores después y la ausencia de tabla/columnas de organización.
Las pruebas de permisos recorren la matriz del servidor. Las de usuarios validan
bcrypt, auditoría, rechazo de roles anteriores y desactivación de sesiones.
Los recorridos de navegador comprueban los menús por rol y la gestión de cuentas
a 360 px. Build, respaldo/restauración del entorno de entrega, migraciones de ese
entorno y operaciones Git/PR corresponden al usuario.

Verificaciones locales de esta entrega: tipos de backend, frontend y E2E;
271 pruebas unitarias del backend, 55 del frontend y tres del servidor frontend;
239 pruebas de integración en la suite completa. Tras adaptar los últimos nombres
docentes, las diez pruebas de datos demo y migración volvieron a pasar.
También pasan los recorridos reales de usuarios, certificados, roles e historial,
y los casos específicos de sesión con rol antiguo e instructor consultando asistencia.
El lint conserva dos advertencias previas en `pdfTexto.ts` y `CursosPagina.tsx`.
No se ha ejecutado el build ni la CI remota.

La batería final de roles, navegación y usuarios demo aprobó sus 20 casos
en escritorio y móvil; se ejecutó sin cambios de código durante el recorrido.
