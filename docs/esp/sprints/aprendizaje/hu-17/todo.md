# HU-17 · Seguimiento

[Especificación](SPEC.md) · [Plan](plan.md).

- [x] Revisar acceso, aula actual, módulos y compatibilidad con HU-19.
- [x] Consultar repositorio, Astryx, npm, GitHub público, inventario MCP y skills.
- [x] Registrar ocho criterios y un plan con dependencias.
- [x] Aprobar reglas de videos soportados, duración, porcentaje, transición y plan.

## Contenido, acceso y configuración

- [x] T1 · Lectura privada de unidades. Verificar acceso del titular y 403 a otro (HU17-01/02).
- [x] T2 · Marca y porcentaje. Verificar primera fecha Lima y repetición (HU17-01/08).
- [x] T3 · Duración y versión del video. Verificar permisos y fuentes compatibles (HU17-06).
- [x] Punto de verificación 1. Pasan acceso, marca y configuración autorizada.

## Configuración y medición

- [x] T4 · Preparación de unidades en la interfaz. Verificar metadatos y teclado (HU17-01/06).
- [x] T5 · Guardado de reproducción y posición. Verificar bloqueo, reintentos y concurrencia (HU17-03/05/06).
- [x] T6 · Umbral y porcentaje. Verificar el umbral del 90 %, la ponderación y la finalización única (HU17-01/06/07).
- [x] Punto de verificación 2. La medición y los porcentajes son reproducibles.

## Aula y entrega

- [x] T7 · Salida y certificación HU-19. Verificar compatibilidad y cierre del mecanismo manual (HU17-07).
- [x] T8 · Reproductor. Verificar avance permitido, retoma, pestaña y ventana (HU17-03/04/05).
- [x] T9 · Barra y estado. Verificar navegación, avance y accesibilidad (HU17-01/06/08).
- [x] Punto de verificación 3. Pasan el aula, las protecciones y las regresiones HU-19.
- [x] T10 · E2E real, revisión de calidad y seguridad y documentación (HU17-01 a HU17-08).
- [x] Punto de verificación 4. Registrar tipos, lint, pruebas y revisión con las referencias del repositorio.
- [x] Ensayar la migración y el retorno de aplicación con una marca anterior.
- [ ] Ejecutar el build manual y revisar la entrega.
- [ ] Aplicar 0044 y 0045 en el destino con copia de seguridad. Verificar las fuentes de video antes de activar grabados existentes.

## Evidencia por incremento

| Tareas | Resultado en rojo observado | Resultado en verde |
| --- | --- | --- |
| T1–T3 | La API de avance aún no estaba registrada. Una comprobación de duración rechazaba materiales ENLACE. Se corrigió la condición SQL para duraciones nulas. | Acepta el acceso del titular y limita a 403 el ajeno o revocado. Una marca concurrente de PDF conserva su primera fecha y junto con el enlace completa el curso presencial. Activación y configuración respetan los roles y las fuentes compatibles. |
| T4 | El recorrido de navegador se añadió a continuación como prueba del flujo de configuración. | En Chromium, el instructor marca la unidad con el teclado y guarda la duración obtenida del WebM. El administrador activa el curso desde la pantalla de gestión. |
| T5–T6 | El endpoint de reproducción faltaba. | Pruebas HTTP de sesión vigente, reemplazo, secuencia, reintento, reloj, posición de reanudación y umbral. La primera lección queda pendiente a 899 ms y se completa a 900 ms de 1000. El curso con dos videos registra 60 % cuando se acreditan 2400 ms de 4000. |
| T7 | El endpoint histórico aceptaba una nueva marca manual en un grabado medido. | HU-19 rechaza la marca nueva. Las marcas anteriores conservan su fecha y desbloquean su salida. El recorrido medido rinde la evaluación y permite emitir un certificado de aprobación. |
| T8–T9 | Vitest falló ante los módulos pendientes. Playwright detectó un nombre accesible con un espacio adicional en el botón de lección. | Vitest cubre continuidad, saltos, duración, barra y fecha de Lima. Playwright comprueba reanudación tras recargar, retroceso, pausa y desbloqueo. Chromium visible comprueba perder el foco de la ventana y cambiar de pestaña. |
| T10 | La comprobación de migraciones del código anterior detectó la ausencia de los SQL aplicados en su copia. | En una base aislada, 0044 y 0045 conservaron una marca de 0043. El código anterior arrancó con los dos SQL presentes y recuperó la finalización histórica. |

## Calidad, seguridad y entrega

Se revisaron `definition-of-done.md` y `security-checklist.md`.
Se verificaron acceso por cuenta e inscripción, validación de entradas y
límites temporales, transacciones, caché privada, conservación de datos
históricos y emisión de HU-19. Las fuentes HTTPS se reproducen en el
navegador. El servidor valida los tramos de reproducción reportados y su
duración. `npm audit --omit=dev` informó cero vulnerabilidades en las
dependencias de producción del entorno local.

### Resultados de verificación

- `npm test` pasó 574 pruebas de backend, 190 de frontend y 7 del servidor frontend.
- `NODE_ENV=test npm run test:integracion` pasó las 442 pruebas completas
  con PostgreSQL 17 y Redis 8 aislados. El bloque de arquitectura, avance y
  evaluaciones también pasó 42 pruebas en ejecución enfocada.
- `npm run e2e:real -- --workers=2` pasó las 45 pruebas de navegador.
  Incluyó el avance medido de HU-17 y la regresión de HU-19 hasta el PDF y QR.
- El recorrido de HU-17 en Chromium visible confirmó el guardado y la pausa
  al cambiar a otra pestaña de la misma ventana y al cambiar de ventana.
- Pasaron `npm run typecheck` y `npm run e2e:tipos`. El lint de frontend
  terminó con dos advertencias previas en `pdfTexto.ts` y `CursosPagina.tsx`.
- El manifiesto, 24 enlaces locales, ocho criterios y diez tareas se
  verificaron junto con `git diff --check`.

### Commit y versión

La entrega incluye el código de HU-17 y su documentación. Las pruebas
específicas y el script de datos de Playwright se mantienen en el entorno
local de verificación.

Mensajes propuestos para ejecución manual de Git.

| Tareas | Summary sugerido |
| --- | --- |
| T1–T3 | `feat: registrar el avance privado de materiales` |
| T4–T6 | `feat: preparar videos y acreditar la reproducción` |
| T7–T9 | `feat: mostrar el avance del aula y habilitar la evaluación` |
| T10 | `docs: registrar la verificación y entrega de HU-17` |

La base local es `v3.1.0.0.1`. Para publicar HU-17 y HU-19 juntas,
se propone `v3.2.0.0.0` por el nivel Función, con el mensaje de etiqueta
`Aprendizaje: avance y evaluaciones`. Los commits y la etiqueta se crean
manualmente. La actualización conserva las versiones npm.
