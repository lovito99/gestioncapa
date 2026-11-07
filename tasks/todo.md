# Seguimiento CPPP

## Etapa 1
- [x] Identidad: título e insignia de la pestaña, rol visible Agremiado, documentación institucional.
- [x] Catálogo público paginado: solo publicados de la organización CPPP configurada, sin materiales ni datos de inscritos.
- [x] Revocación del token al salir, conservando otras sesiones del mismo usuario.
- [x] Bloqueo de 15 minutos tras cinco accesos fallidos y límite de peticiones por usuario.
- [x] Pruebas de API, permisos y navegador Chromium; tipos y documentación.
- [ ] Build: ejecución manual por el usuario.

## Etapas siguientes
- [ ] Etapa 2: padrón, recuperación, perfiles, usuarios y sedes.
- [ ] Etapa 3: formación, categorías, reprogramación y notificaciones.
- [ ] Etapa 4: aprendizaje y evaluaciones.
- [ ] Etapa 5: pagos y comprobantes.
- [ ] Etapa 6: certificación y auditoría.
- [ ] Etapa 7: videoconferencia propia y asistencia virtual.
- [ ] Etapa 8: consulta, reportes y operación.

No se cambia el estado de una etapa por tener únicamente una pantalla demo.

## Evidencia de esta entrega

- Tipos de backend/frontend aprobados; sin ejecutar build.
- 255 pruebas unitarias backend y 55 frontend, más 3 del servidor frontend.
- 215 pruebas de integración aprobadas en una base temporal aislada.
- 29 recorridos Chromium: catálogo público (dos a 360 px y uno con backend real), acceso y navegación.
- Mutación comprobada: cambiar el bloqueo al sexto fallo hace fallar la prueba.
- Lint frontend: sin errores, con dos advertencias preexistentes (regex en pdfTexto y estado en efecto del catálogo).
- Pendientes: build manual, revisión humana del PR y matriz completa de navegadores.


## T-23: adaptación y evidencia

- [x] Documentar cambio de enfoque, vocabulario y compatibilidad del Sprint 1.
- [x] Corregir el mapa de la portada pública y los nombres visibles de roles en documentación vigente.
- [x] Registrar prioridades de los sprints 2 y 3 sin inventar fechas o puntos.
- [x] Distinguir integración real, demostración y evidencia externa pendiente.
- [ ] Validar correspondencia del original Figma con la copia usada por el frontend.
- [ ] Adjuntar evidencia del backlog y Planning Poker del Lab 5.
- [ ] Validar reglas de HU-20 con el CPPP.

Esta entrega de T-23 modifica documentación; las pruebas de la etapa 1 registradas
arriba corresponden a la entrega anterior, no se atribuyen a nuevas funciones.


Verificación documental de T-23: 55 enlaces locales comprobados, referencias a
código/pruebas existentes y alcance de sprints revisados; `git diff --check` sin
errores. No se ejecutaron pruebas funcionales nuevas ni build porque todos los
cambios de esta entrega son Markdown. No se modificaron versiones ni Git.


## HU-50

- [x] Registro persistente, rol fijado por servidor, unicidad, bcrypt y auditoría atómica.
- [x] Validación en español, conservación de datos y recuperación asistida.
- [x] Formulario y flujo demo/real a 360 px con teclados numéricos.
- [ ] Aplicar migraciones en el entorno de entrega y ejecutar build manual.

La recuperación automática por correo, el padrón y el docente externo quedan fuera
de esta entrega.


## HU-16

- [x] Confirmación gratuita y reserva pagada persistente, sin duplicados ni exceso de cupos.
- [x] Estado consistente en detalle, Mis cursos, historial y PDF.
- [x] Conservar inscripción manual y estados históricos.
- [ ] Migración 0012 y build en el entorno de entrega: ejecución manual.

HU-33 y HU-32 quedan fuera de esta entrega.
