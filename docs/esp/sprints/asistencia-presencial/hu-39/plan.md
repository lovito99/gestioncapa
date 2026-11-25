# HU-39 · Plan de implementación

**Estado** Implementación aprobada y en cierre de verificación. [Especificación](SPEC.md) · [Seguimiento](todo.md).

## Enfoque

La puerta dispondrá de un contrato privado pequeño que permita al encargado
descubrir y abrir solo las sesiones delegadas. «Mi QR» se integra con la
identidad del colegiado. Las dos entradas de puerta y el QR rotatorio
convergen en la misma tabla de asistencias y aplican la restricción única
existente. Se extienden las pantallas actuales, con dependencias ya instaladas.

## Tareas verificables

| ID | Incremento | Depende de | Criterio y verificación enfocada |
| --- | --- | --- | --- |
| T39-01 | Firmar y validar la credencial de puerta | — | Prueba unitaria con formato, firmas diferentes, clave ajena, QR rotatorio y contenido sin datos de perfil. HU39-05. |
| T39-02 | Mostrar «Mi QR» al titular | T39-01 | API y UI muestran código estable, DNI parcial, acceso por cuenta y próxima sesión futura en Lima. Verificar peticiones paralelas y caché por cuenta. HU39-01. |
| T39-03 | Descargar el PDF escaneable | T39-02 | Renderizar con el generador existente y comprobar que un escaneo del PDF recupera el mismo token. Verificar MIME, descarga privada y ausencia de DNI completo. HU39-01. |
| T39-04 | Guardar el encargado al programar y editar | — | Migración aditiva, DTO y persistencia. Verificar asignación por defecto, delegado activo, rechazo de rol inválido y persistencia al recargar. HU39-06. |
| T39-05 | Abrir la puerta con permisos limitados | T39-04 | Contexto y vínculo para delegado. El instructor ajeno y el delegado reasignado reciben 403. El delegado no obtiene edición ni lectura general de gestión. HU39-06. |
| T39-06 | Registrar por QR personal | T39-02, T39-05 | HTTP y PostgreSQL comprueban 201, nombre/DNI parcial, no inscrito, error de firma, usuario inactivo, sesión cancelada o virtual, curso cerrado y carrera de duplicados. HU39-02/04/05. |
| T39-07 | Buscar y registrar por DNI | T39-06 | POST sin DNI en URL, coincidencia exacta, ceros iniciales, conjunto de inscritos y exclusión por cobro previo. Registrar revalida la matrícula. Confirmar límite, privacidad y carrera QR/DNI. HU39-03/04. |
| T39-08 | Conectar cámara, DNI y contador | T39-06, T39-07 | Playwright con backend real y prueba local en móvil. Verificar permiso denegado, fallback, lectura sucesiva, limpieza de cámara y descarte de resultados anteriores. HU39-02–05. |
| T39-09 | Conservar «Deshacer» con trazabilidad | T39-06, T39-07 | Rectifica una marca de puerta concreta. Reenvío obsoleto, rotatorio, virtual o actor ajeno quedan bloqueados. Verificar evento de auditoría y actualización de conteos. HU39-04. |
| T39-10 | Aplicar la opción de QR rotatorio | T39-04, T39-06 | La misma política guardada gobierna emisión y marcado durante la transacción. Verificar token emitido antes de apagar, caso `AMBAS`, legado y regresión HU-07/HU-08. HU39-07. |
| T39-11 | Verificar la entrega completa | T39-03, T39-08, T39-09, T39-10 | Recorrido real con móvil y PDF, regresiones de asistencia virtual, cobro, constancia y roles. Revisar migración sobre datos anteriores y actualizar contrato y pasos para publicar. HU39-01 a HU39-07. |

T39-01–03 y T39-04 pueden avanzar independientemente hasta integrar la
puerta. Cada tarea empieza con una prueba que falle por el cambio esperado.
Registrar rojo, causa raíz si corresponde, verde y Summary para el commit
manual. Los archivos de pruebas nuevos se mantienen locales.

## Puntos de control

1. **T39-01–03:** emisión, descarga y lectura de la misma credencial, con acceso por cuenta.
2. **T39-04–07:** asignación persistida, permisos y una sola marca con ambas entradas.
3. **T39-08–10:** uso fluido en móvil, corrección auditada y rotatorio alternativo.
4. **T39-11:** tipos, lint, integración, pruebas de navegador y revisión con
   `definition-of-done.md` y `security-checklist.md` de
   `~/.agents/agent-skills/references/`.

## Riesgos y condiciones de publicación

| Riesgo | Verificación |
| --- | --- |
| Delegación amplía el acceso a sesiones ajenas | Aislar contexto de puerta y comprobar los permisos cada vez. Probar reasignación, desactivación y rutas de gestión protegidas. |
| DNI y credencial quedan en registros o caché | Revisar URLs, logs y respuestas. Evitar rastreo por prefijos y resultados de consultas previas. Validar límites y limpieza al salir. |
| QR copiado, alterado o de otro flujo | Firma con propósito propio e identidad confrontada en puerta. Probar códigos de ambos flujos en sentido cruzado y prever reemplazo de credencial si se compromete. |
| Dos marcas simultáneas u operación deshacer atrasada | Restricción única, transacción y marca identificada en la corrección. Verificar actores, hora y métodos en PostgreSQL. |
| El historial de migraciones impide volver al artefacto anterior | La prueba aislada confirmó que el backend necesita el archivo 0046 una vez aplicado. Preparar un artefacto de retorno que incluya 0046 y respete la configuración de puerta y rotatorio. |
| Cámara indisponible en puerta | Verificar HTTPS, permisos y escaneo de teléfono y papel en dispositivos del equipo. La búsqueda por DNI mantiene el recorrido disponible. |

## Publicación

1. Resolver los archivos locales de HU-37 que importan código de otra rama,
   comprobar la discrepancia de las pruebas locales de arranque y ejecutar
   el build manual sobre el checkout que se vaya a publicar.
2. Probar con un teléfono por HTTPS un QR en pantalla y una copia impresa.
   Repetir con permisos de cámara denegados y con el DNI como alternativa.
3. En la ventana de entrega, respaldar la base, verificar PostgreSQL y Redis
   y ejecutar `npm run migrate` para aplicar 0046 antes de iniciar el backend.
   Confirmar salud, delegación y modo rotatorio con una sesión de prueba.
4. Supervisar rechazos de firma, duplicados, límites de búsqueda y
   rectificaciones por código y estado. Los eventos de éxito usan identificadores
   internos y método. Mantener el DNI y el token fuera de los registros.
5. Preparar y validar un artefacto de retorno que incluya 0046 y mantenga
   el control de ambos modos de asistencia. Si se restaura un respaldo,
   reconciliar las marcas y rectificaciones posteriores a la copia.
6. El usuario ejecuta build, staging, commits y publicación. El sprint
   conserva su número sin asignar en el manifiesto.

## Commits propuestos

| Alcance | Summary |
| --- | --- |
| Credencial y ajustes de sesión, incluida la migración | `feat: agregar credencial y configuración de asistencia presencial` |
| Registro, permisos limitados, corrección, interfaces y compatibilidad rotatoria | `feat: registrar asistencia en puerta por QR personal o DNI` |
| Contrato público, verificación y publicación | `docs: documentar la implementación y verificación de HU-39` |

La versión se recomienda para la entrega completa. La rama parte de la
etiqueta alcanzable `v3.1.0.0.1`. `v3.2.0.0.0` existe en otra línea.
Si la publicación integra esa entrega, corresponde `v3.3.0.0.0` por la
nueva funcionalidad. No se asignó versión ni se creó un commit.
