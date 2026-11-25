# HU-17 · Plan de implementación

**Estado:** implementado. Build y publicación pendientes. [Especificación y soluciones existentes](SPEC.md) · [Seguimiento](todo.md).

## Decisiones técnicas

- Reutilizar módulos y materiales existentes. La unidad obligatoria sale del
  catálogo del curso y cada video medido tiene duración y versión persistidas.
  El instructor prepara el contenido. La activación de un grabado con materiales
  previos comprueba la duración y la compatibilidad antes de exigir medición.
- Usar PostgreSQL para avance y reanudación, con un tramo continuo desde cero,
  posición independiente y un instante de primera finalización. Trabajar en
  milisegundos enteros y comparar el 90 % antes de redondear. Preservar los
  criterios de acceso y el formato de errores de Fastify.
- Mantener el reproductor HTML y los controles accesibles con patrones del aula
  y Astryx. Separar eventos del medio, sesión de medición y presentación de
  resumen. El servidor usa reloj propio y valida avance consecutivo,
  reintentos, cotas y pertenencia. La página sincroniza regularmente.
- Integrar HU-19 antes de quitar la marca manual en cursos medidos. La lectura
  unificada conserva marcas anteriores para salida y certificación y evita
  convertirlas en segundos. Ninguna dependencia nueva.

## Orden de implementación

Cada incremento lleva verificación enfocada en rojo y verde. Registrar prueba,
resultado y mensaje de commit para ejecución manual. Las áreas indicadas son
orientativas y se ajustan al revisar los contratos.

| ID | Tarea | Depende de | Verificación enfocada | Áreas probables |
| --- | --- | --- | --- | --- |
| T1 | Leer unidades del curso con el acceso del titular | — | HTTP con dos colegiados inscritos, titular ajeno 403 y no autenticado 401. Curso sin cuestionario disponible. HU17-01/02. | Rutas, permisos, repositorio de cursos y prueba de integración. |
| T2 | Registrar consulta de material y porcentaje por unidad | T1 | Doble clic y dos solicitudes concurrentes crean una marca. Fechas se muestran en Lima y porcentaje entre 0 y 100, también sin unidades. HU17-01/08. | Migración aditiva de avance, dominio, consulta y pruebas de integración/tipos. |
| T3 | Fijar duración y versión del video | T1 | Solo el instructor asignado puede preparar una fuente válida y solo el administrador puede activar el curso. Una fuente incompatible no se activa. HU17-06. | DTO de material, persistencia, política y pruebas HTTP. |
| T4 | Exponer la preparación de unidades audiovisuales | T2, T3 | Desde la ficha el instructor configura videos e indicadores obligatorios. Probar duración finita, error de metadatos y lista de preparación con teclado. HU17-01/06. | Formulario, vista previa, componente de validación y Vitest. |
| T5 | Guardar reproducción consecutiva y posición | T2, T3 | Probar límites, segundos únicos, adelanto, secuencias repetidas o fuera de orden, desconexión y sesión reemplazada. HU17-03/05/06. | Servicio de avance, transacción, DTO y pruebas HTTP/concurrencia. |
| T6 | Calcular finalización medida y porcentaje de grabado | T5 | Probar 89,999 s, 90 s, 100 s, suma ponderada 60 %, progreso vacío y timestamp estable. HU17-01/06/07. | Regla de dominio, consulta y prueba de integración. |
| T7 | Compartir finalización con HU-19 | T6 | Rechazar una marca manual nueva de video medido, habilitar la salida al cumplir el umbral y certificar con la misma fuente. Probar curso anterior, marca histórica, retención y certificado existente. HU17-07. | Lectura de evaluación y certificación, migración/compatibilidad y pruebas de regresión. |
| T8 | Controlar pausa, avance permitido y reanudación en el aula | T5 | Probar estado de reproducción con pérdida de visibilidad, pérdida de foco, búsqueda, pausa y buffering. Verificar teclas, posición guardada tras retroceso y retorno después de recargar. HU17-03/04/05. | Reproductor, hook de sesión y pruebas de componentes. |
| T9 | Mostrar barra y estado por unidad | T2, T4, T6, T8 | Una sola fuente para progreso confirmado. Probar barra accesible, recálculo y estados vacío, error y reanudación. HU17-01/06/08. | Aula, React Query, rutas desde la ficha y «Mis cursos», Vitest. |
| T10 | Comprobar el recorrido real y preparar la entrega | T7, T9 | Playwright con video de prueba, pausa por foco real, bloqueo de búsqueda, recarga, dos cuentas, 90 % y salida HU-19. Verificar todos los HU17-01 a HU17-08. | Fixture local de video, integración E2E, documentación de API y revisión. |

T2 y T3 pueden hacerse en paralelo tras acordar el contrato de material.
T7 y T8 pueden avanzar una vez fijadas la persistencia y las respuestas. No
activar la transición de grabados existentes hasta que las regresiones de T7
pasen. La enumeración histórica de migraciones se conserva.

## Puntos de verificación

1. **T1–T3.** Unidades privadas, marca persistida y acceso de configuración.
   Comprobar fecha y hora de Lima con el navegador en otro huso.
2. **T4–T6.** Preparación de video, posición y medición reproducibles. La regla
   da el mismo porcentaje tras reintentos, concurrencia y reanudación.
3. **T7–T9.** El aula funciona antes y después de configurar un cuestionario.
   El modo medido no tiene ruta manual que pueda completar un video.
4. **T10.** Tipos, lint, unitarias, integración y navegador real. Registrar
   prueba de cambio real de foco además de eventos simulados. Aplicar
   `definition-of-done.md` y `security-checklist.md` de
   `~/.agents/agent-skills/references/`. El usuario ejecuta el build.

## Riesgos y controles

| Riesgo | Control y verificación |
| --- | --- |
| Datos privados de otra cuenta | Comparar titular, rol y acceso antes de consultar. Ensayar misma inscripción de curso con dos cuentas y revocación de acceso. |
| Adelanto y duplicados | Validar origen en el tramo continuo, acotar con duración oficial y reloj, y serializar por inscripción. Ensayar reportes fuera de orden, ventana reemplazada y reintento del mismo reporte. |
| Medición de video externo, cambiado o incompatible | Usar versión y duración confirmadas, exigir reproducción verificable en el reproductor y ofrecer un estado visible ante desajuste. El backend no solicita la URL del material. |
| Pérdida de los últimos segundos al cerrar | Confirmar estado periódicamente y sincronizar al pausar. Al reabrir, recuperar la última posición confirmada y distinguir errores de red. |
| Avances históricos y salida discrepante | Usar una sola consulta de finalización, compatibilidad con marcas HU-19 y comparación con un curso histórico representativo. |
| Fecha dependiente del equipo | Guardar instante del servidor. Formatear Lima de forma explícita y probar medianoche. |

## Publicación y versión propuestas

- Antes de publicar, probar migraciones sobre datos previos, preparar los videos
  de cursos existentes, comprobar navegador visible y validar el retorno al
  código anterior con el conjunto de migraciones aplicadas disponible.
- Aplicar primero las migraciones aditivas 0044 y 0045 en el destino con una
  copia de seguridad disponible. Preparar y validar un grabado antes de activar
  cursos existentes. Probar el inicio, guardado y retoma con las URLs del
  destino. Revisar códigos de error y latencia de las rutas de avance en los
  registros existentes, sin registrar cuerpos, tokens de sesión ni URLs de
  medios.
- Para volver al código previo, conservar los archivos 0044 y 0045 junto con
  la base. El verificador requiere los SQL ya aplicados. HU-19 histórico puede
  leer sus marcas anteriores. Después de activar cursos medidos, una vuelta
  a HU-19 anterior interrumpe la lectura de sus finalizaciones nuevas hasta
  restablecer HU-17. Mantener la versión compatible con la vista compartida al
  decidir un retorno después de la activación.
- Base local comprobada `v3.1.0.0.1` en `81270ca`. La rama contiene HU-19 sin
  etiqueta funcional posterior local. Si HU-17 y HU-19 se entregan juntas desde
  esa base, la propuesta por **Función** es `v3.2.0.0.0`. Si HU-19 se publica
  primero bajo esa etiqueta, HU-17 se evalúa sobre la nueva base. El agente
  prepara mensajes y el usuario realiza las operaciones Git.
