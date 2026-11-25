# HU-55 · Plan de implementación

El alcance aprobado y los contratos están en la [especificación](SPEC.md).
El progreso y las verificaciones se registran en [todo.md](todo.md).

## Diseño y dependencias

- Derivar el bloqueo de la lista ordenada de videos obligatorios y de
  `finalizacionesContenido` en el contexto del titular. Usar el primer
  pendiente para las proyecciones y la consulta individual. Reutilizar el
  bloqueo de curso e inscripción de los servicios existentes para comprobarlo
  antes de escribir y mantener la decisión consistente en lecturas paralelas.
- Entregar los metadatos en listados y reservar la fuente de los videos
  obligatorios al detalle autorizado. Usar el aula de avance en la ficha del
  alumno y el mismo detalle para la navegación desde el aula o un enlace.
- Usar las consultas y el estado de HU-19. Tener en cuenta la secuencia medida
  en el listado, detalle y envío de la salida oficial, conservando el contrato
  de conflicto ante lecciones pendientes.
- No se necesitan paquetes, migraciones, cambios de CI ni cambios en catálogos
  públicos. Conservar el orden fijado por el curso, la validez de los datos
  históricos y las reglas de acceso de cobro. El principio de diseño para UI es
  texto siempre visible para el requisito y una acción de apertura solo cuando
  el servidor la autoriza.

Orden sugerido: T1 → T2 → T3 → T4 → T5 → T6. Tras T1, el tramo de salida (T5)
puede avanzar en paralelo con el detalle del aula si se acuerda el contrato y se
verifica la integración en T6.

## Tareas y puntos de control

| Tarea | Cambio verificable y prueba inicial en rojo | Aceptación | Preparación de commit manual |
| --- | --- | --- | --- |
| T1 · Mostrar la secuencia | Probar una lista con tres videos, dos módulos, otro titular y una finalización histórica posterior a un hueco. Extender la consulta de avance con la decisión por fila. Mostrar candado y el requisito, sin acción de apertura en filas bloqueadas. Prueba unitaria de la regla, integración de metadatos y Vitest de la lista. | HU55-01, HU55-05 | `feat: mostrar la secuencia de lecciones grabadas` |
| T2 · Autorizar el detalle y sus fuentes | Probar que la consulta a una lección bloqueada responde 403 y que su fuente está ausente de avance, ficha y listado de evaluaciones para el alumno. Incorporar el detalle autenticado, usarlo para abrir el video desde el aula y retirar enlaces externos de las proyecciones de la secuencia. Probar que el instructor asignado conserva su gestión y que el material complementario mantiene sus rutas. | HU55-03, HU55-05 | `feat: proteger la consulta directa de lecciones grabadas` |
| T3 · Autorizar reproducción y progreso | Probar que una lección bloqueada no abre sesión ni guarda avance. Reutilizar la regla en las dos operaciones y validar al titular, curso y versión dentro de la transacción. Cubrir solicitudes de la misma inscripción durante la finalización y verificar la ausencia de cambios ante un 403. | HU55-02, HU55-03 | `feat: aplicar la secuencia al avance de reproducción` |
| T4 · Habilitar al alcanzar el umbral | Probar desde el aula que guardar progreso por debajo del 90 % no cambia el bloqueo. En el éxito del guardado que alcanza el umbral, actualizar las consultas existentes. Conectar el enlace interno al detalle y mostrar el motivo del 403 en esa navegación. Probar regreso al aula, recarga y teclado. | HU55-01, HU55-02, HU55-03 | `feat: habilitar la siguiente lección al completar el video` |
| T5 · Coordinar la salida oficial | Probar un cuestionario publicado con una lista previa que omite un video obligatorio medido. Comprobar el bloqueo desde el aula, el 409 de detalle y entrega, y el desbloqueo con el último requisito. Validar intentos, calificación, ruta histórica, evaluación no oficial y certificado existente. | HU55-04, HU55-05 | `feat: exigir las lecciones obligatorias para rendir la salida` |
| T6 · Revisar y preparar la entrega | Reproducir el recorrido completo en navegador real con PostgreSQL, dos videos controlados y una salida; incluir ficha y enlace bloqueado, foco y estado después de recargar. Pasar pruebas de regresión y revisión de errores, calidad y seguridad. Registrar hallazgos, comprobaciones y condiciones de publicación. | HU55-01 a HU55-05 | `docs: registrar la verificación de lecciones en orden` |

T1 y T2 forman el primer punto de control. Revisar los dos juntos antes de
entregar el flujo del aula para verificar que el listado y todas las vías de
consulta coinciden. Después de T3 y T4 se valida el desbloqueo real al 90 %.
Después de T5 se comprueba el cuestionario con los dos tipos de curso y la
retención de resultados anteriores.

## Ejecución posterior

1. Por cada cambio de comportamiento, añadir una prueba local, revisar que el
   fallo sea el esperado, aplicar el cambio mínimo y volver a ejecutar la
   prueba. Documentar ambos resultados antes de preparar el texto de commit
   manual. Mantener los archivos de prueba nuevos fuera del índice de Git.
2. Investigar fallos reproducibles hasta localizar su causa. Después del verde,
   revisar duplicación de la regla y sus proyecciones, errores y estados de UI.
   Revisar con `code-review-and-quality`, `security-and-hardening` y las
   referencias `definition-of-done.md` y `security-checklist.md` de
   `~/.agents/agent-skills/references/`. Aplicar la lista de accesibilidad a
   controles bloqueados y mensajes del aula.
3. Ejecutar `npm run typecheck`, `npm test`, `NODE_ENV=test npm run test:integracion`
   y `npm run e2e:real -- hu55.local.spec.ts` tras preparar el escenario local. Usar la
   base y credenciales de prueba. En pruebas de navegador usar medios de
   duración controlada compatibles con HU-17, sin depender de YouTube.
4. Antes de publicar, revisar que el backend con autorización y el frontend que
   pide fuentes al detalle se desplieguen de forma coordinada, porque el listado
   del alumno dejará de entregar esas fuentes. Confirmar que un curso medido y
   una salida publicada funcionan de principio a fin en el entorno de
   verificación. El usuario ejecuta `npm run build` manualmente. Sin cambios de
   datos en esta entrega, la reversión coordinada de ambos componentes puede
   conservar todo el avance ya acreditado. La publicación y las operaciones
   Git quedan a cargo del usuario.

## Riesgos destacados

- Una salida histórica pudo publicar un subconjunto de videos. Cubrir el
  conjunto de la publicación y la secuencia medida antes de rendir, sin
  recalcular certificados y resultados ya emitidos.
- Entre consultas, un cliente podría tener información anterior. Entregar el
  estado confirmado tras guardar y volver a comprobar la autorización en el
  servidor en vez de depender del estado local.
- Si negocio requiere YouTube como requisito, revisar la decisión de alcance
  y la medición antes de implementar esta propuesta.

## Versión orientativa

Base local alcanzable `v3.2.0.0.0`. La documentación sola correspondería a
`v3.2.0.0.1` si el usuario decide etiquetarla. La entrega funcional completa
correspondería a `v3.3.0.0.0` sobre esa misma línea por añadir la navegación
secuencial con control de acceso. Revisar la base cuando se vaya a etiquetar
según [VERSIONING.md](../../../../../VERSIONING.md).
