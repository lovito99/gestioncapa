# HU-37 · Seguimiento

[Especificación](SPEC.md) · [Plan](plan.md).

## Preparación

- [x] Revisar el código y la trazabilidad de HU-17, HU-19 y HU-36.
- [x] Consultar repositorio, Astryx, npm, GitHub público, documentación de
  YouTube e inventario de MCP y skills.
- [x] Registrar seis criterios de aceptación, riesgos y dependencias.
- [x] Aprobar especificación y plan. Confirmar alcance complementario de
  YouTube y modalidades de cobro disponibles.

## Fuente y persistencia

- [x] T37-01 · Validar enlace e interpretar duración. Casos válidos e inválidos.
- [x] T37-02 · Obtener metadatos desde YouTube. Verificar errores y cuota.
- [x] T37-03 · Guardar alta autorizada al final del curso. Comprobar
  transacción y reenvío.
- [x] Control 1 · Alta autorizada con duración y orden persistidos.

## Orden, archivos y estado

- [x] T37-04 · Guardar el orden. Probar una revisión obsoleta y lección ajena.
- [x] T37-05 · Adjuntar y descargar PDF. Probar acceso y límite de tamaño.
- [x] T37-06 · Guardar estado personal. Probar aislamiento entre cuentas.
- [x] Control 2 · Orden, PDF, estado propio y acceso comprobados en PostgreSQL.

## Interfaces de instructor y colegiado

- [x] T37-07 · Dar de alta la lección en la ficha. Verificar mensaje y duración.
- [x] T37-08 · Reordenar con teclado y conservar foco.
- [x] T37-09 · Adjuntar y descargar el PDF de una lección.
- [x] T37-10 · Mostrar aula en orden, estado y reproductor a solicitud.
- [x] Control 3 · Probar navegación, móvil y teclado con ambos roles.

## Regresiones y publicación

- [x] T37-11 · Verificar cambios de cobro y acceso gratuito al video.
- [x] T37-12 · Verificar refresco, vencimiento y retiro de metadatos.
- [x] T37-13 · Verificar regresiones de avance y certificación en HU-17 y HU-19.
- [x] Control 4 · Comprobar límites de acceso, vigencia y compatibilidad.
- [x] T37-14 · Pasar la prueba E2E simulada y revisar arquitectura y seguridad.
- [x] Ensayar el retorno de aplicación con lecciones incorporadas y
  documentar la condición para conservar la elegibilidad de HU-19.
- [x] Control 5 · Registrar pruebas en rojo y verde, tipos, lint y revisión
  con las referencias acordadas.
- [ ] Probar con clave autorizada y video no listado de prueba en el entorno
  de destino. Revisar privacidad, accesibilidad y políticas de YouTube.
- [ ] Build manual, validación de la migración y decisión de publicación.

## Evidencia de implementación

| Incrementos | Rojo observado | Verde |
| --- | --- | --- |
| T37-01–02 | Módulos de validación y proveedor pendientes. | Formatos válidos e inválidos, duración ISO, filtros de inserción, privacidad y región, errores sin credenciales en la respuesta. |
| T37-03–06, T37-11, T37-13 | Las rutas aún respondían 404. | Alta concurrente e idempotente, orden global, PDF privado, estado por inscripción, cobro previo rechazado y elegibilidad de HU-19 preservada. |
| T37-07–10 | Faltaban las vistas. El primer recorrido E2E usaba un curso con política de cobro ausente. | Chromium verifica enlace inválido, guardado con duración, foco de teclado al mover, orden después de recargar, descarga de PDF y estados persistidos. |
| T37-12 | Faltaba el proceso de vigencia. | PostgreSQL deja de servir metadatos vencidos, los depura también ante un fallo de YouTube y permite renovarlos sin perder el estado. |
| T37-14 | La comprobación inicial de navegador detectó claves duplicadas entre dos secciones del aula. | Se verificaron HU-37 con respuesta simulada de YouTube, HU-17 y HU-19 en Chromium con backend real. 0045 → 0046 se aplicó en una base aislada y conservó un enlace histórico. |

### Verificaciones y controles

- Verificados seis criterios, 14 tareas, YAML, enlaces y `git diff --check`.
- El bloque enfocado de backend pasó 22 pruebas. `npm test` pasó 603 pruebas
  de backend, 193 de frontend y 7 del servidor frontend.
- La suite completa de integración pasó 463 pruebas en PostgreSQL y Redis
  aislados.
- El recorrido de navegador pasó tres pruebas E2E de HU-17, HU-19 y HU-37.
  La prueba de HU-37 simula las respuestas de YouTube Data API y el contenido
  del iframe. Una repetición confirmó el recorrido a 360 px sin desbordamiento.
- Pasaron `npm run typecheck` y `npm run e2e:tipos`. El lint conserva dos
  advertencias previas. `npm audit --omit=dev` informó cero vulnerabilidades
  en las dependencias locales de producción.
- El ensayo de retorno en PostgreSQL y Redis aislados comprobó el arranque
  de `3817e1e` con `0046`. Con lecciones incorporadas esa revisión pierde
  el filtro de HU-19. Restablecer el backend de HU-37 preservó la separación
  y recuperó duración, orden, PDF y estado. [Detalle del retorno](plan.md#retorno-de-aplicación-verificado)
- La prueba con YouTube real sigue pendiente. El entorno local carece de
  `youtubeClaveApi` y de un video no listado de prueba configurado. Se probó
  el verificador local con cuatro casos: falta de clave, URL inválida,
  video ausente y duración válida con proveedor simulado. Pasó la
  comprobación de tipos del backend.
- Se aplicaron `definition-of-done.md` y `security-checklist.md` a roles,
  pertenencia e inscripción, cobro previo, archivos, caché privada, destino
  fijo del proveedor, límites de solicitudes y errores sin datos sensibles.

### Commits manuales propuestos

| Tareas | Summary |
| --- | --- |
| T37-01–03 | `feat: verificar y guardar lecciones de YouTube` |
| T37-04–06 | `feat: guardar el orden, los PDF y el estado de las lecciones` |
| T37-07–10 | `feat: integrar las lecciones de YouTube en el aula grabada` |
| T37-11–14 | `feat: proteger vigencia y acceso de las lecciones complementarias` |

Las pruebas específicas, el simulador y los datos de prueba quedan en local.
La base etiquetada es `v3.1.0.0.1`. Para publicar HU-17, HU-19 y HU-37 de
forma conjunta se propone `v3.2.0.0.0` por el nivel Función. El usuario
ejecuta los commits, la etiqueta y el build.
