# HU-37 · Plan de implementación

**Estado:** implementado. Build y verificación con YouTube real pendientes. [Especificación y soluciones existentes](SPEC.md) · [Seguimiento](todo.md).

## Decisiones técnicas

- Usar `videos.list` desde un proveedor pequeño en `backend/src/providers`
  con `fetch`, Zod y destino fijo. Mantener la clave restringida del lado del
  servidor. La propuesta utiliza las dependencias del proyecto.
- Conservar los materiales y los módulos de origen. Asociar cada lección a
  su material de video y al PDF opcional. Usar posiciones únicas por curso,
  una revisión de orden y una transacción común para alta, edición de orden
  y comprobaciones de cobro concurrentes.
- Guardar duración, disponibilidad y fecha de verificación como metadatos del
  proveedor. Consultar los vencimientos en lotes y refrescar o eliminar esos
  datos dentro del plazo de YouTube. El ID aportado por el instructor y las
  marcas propias quedan disponibles para conservar la asociación histórica.
- Extender los controles existentes con formulario de alta, botones de
  orden, descarga y una fila por lección con estado textual. Presentar
  el iframe oficial con sus controles. Usar la duración del proveedor para
  mostrarla junto al estado de GestionCapa.
- Mantener las marcas complementarias fuera del porcentaje y las evaluaciones
  vigentes. Leer los accesos de inscripción y pago del curso en las rutas
  privadas. Impedir que un cambio a modalidad de cobro previo deje el video
  de YouTube detrás del pago.

## Incrementos y dependencias

| ID | Cambio verificable | Depende de | Prueba de aceptación | Áreas previstas |
| --- | --- | --- | --- | --- |
| T37-01 | Validar y normalizar enlaces e interpretar duración | — | Acepta formatos definidos. Rechaza dominios ajenos, IDs inválidos y listas sin video. Convierte horas y minutos y rechaza duración vacía, cero o fuera de rango. HU37-03/05. | DTO y dominio, `node:test` local. |
| T37-02 | Consultar metadatos de YouTube | T37-01 | Respuesta simulada válida entrega duración. Ausencia de video, privacidad distinta, inserción desactivada y emisión en vivo generan error claro. Timeout, cuota y credencial ausente permiten reintento y no exponen la clave. HU37-03/05. | Proveedor, configuración y pruebas HTTP simuladas. |
| T37-03 | Guardar una lección validada al final del curso | T37-02 | Solo el instructor asignado de un grabado abierto puede crearla. La escritura es atómica y el reenvío de la misma operación recupera la lección. Llamadas concurrentes conservan posiciones distintas. HU37-01/03/05. | Migración aditiva, repositorio, servicio y ruta. |
| T37-04 | Persistir un orden completo con control de concurrencia | T37-03 | Intercambia lecciones de dos módulos. Listas obsoletas, parciales, duplicadas o ajenas no modifican el orden guardado. HU37-02. | Repositorio, API y prueba PostgreSQL. |
| T37-05 | Adjuntar PDF a su lección | T37-03 | Instructor asigna un PDF y el inscrito lo descarga. Archivo inválido, pertenencia ajena o acceso revocado se rechazan. HU37-04. | Validación PDF, relación de material, descarga e integración. |
| T37-06 | Consultar y guardar el estado personal | T37-03 | Índice privado y ordenado. La apertura y finalización explícitas son idempotentes. Otra cuenta conserva su propio estado. Catálogo y usuarios sin acceso carecen del enlace. HU37-06. | Modelo de seguimiento por inscripción, API y prueba HTTP. |
| T37-07 | Alta en la ficha del instructor | T37-03 | El instructor guarda título, módulo y enlace. El alta muestra duración devuelta por el servidor. Una respuesta inválida conserva el borrador y señala el campo. El alta nueva de YouTube en grabados usa esta entrada. HU37-01/03/05. | Servicio web, ficha, plantilla de formulario y pruebas de presentación. |
| T37-08 | Editar el orden desde el teclado | T37-04, T37-07 | «Subir» y «Bajar» conservan foco y anuncian posición. Confirmar persiste el orden al recargar; un conflicto permite recuperar la versión vigente. HU37-02. | Lista de instructor, React Query y prueba en navegador. |
| T37-09 | Adjuntar y descargar PDF desde las pantallas | T37-05, T37-07 | Adjunta en gestión. En el aula descarga desde la lección exacta. Valida tamaño, tipo y error de acceso. HU37-04. | Campo de PDF y ayudante existente de descarga. |
| T37-10 | Mostrar índice, reproductor y estados del aula | T37-04, T37-06, T37-09 | El recorrido desde «Mis cursos» muestra título, orden, duración, seguimiento propio e iframe al abrir. Verificar teclado, móvil, avisos de fuente y persistencia al volver. HU37-06. | Aula HU-17, servicio, vista de lección y prueba local de navegador. |
| T37-11 | Aplicar la política de acceso gratuito al video | T37-03, T37-06 | Rechaza el alta en cursos con pago previo y una transición de cobro que bloquee videos incorporados. Una transición concurrente no deja una lección detrás del pago. HU37-01/06. | Cobro, comprobaciones de acceso e integración. |
| T37-12 | Renovar y depurar metadatos del proveedor | T37-02, T37-03 | Un cambio de privacidad retira la reproducción. Ante fallo de refresco y caducidad, duración y disponibilidad anteriores dejan de exponerse y se depuran según el plazo. Orden y estado propio se conservan. HU37-03/05/06. | Trabajo periódico, repositorio de metadatos y pruebas de reloj. |
| T37-13 | Conservar el avance y la elegibilidad existentes | T37-06, T37-10 | Las marcas de YouTube no conceden avance medido. Las lecciones y finalizaciones históricas de HU-17/HU-19 y la emisión de HU-19 conservan sus reglas. HU37-06. | Consultas de avance y evaluación, regresiones locales. |
| T37-14 | Verificar el recorrido y preparar la publicación | T37-08 a T37-13 | Usuario autorizado completa el recorrido y otro queda fuera. Validar duración y reproducción con un clip controlado, documentar el contrato y registrar seguridad, retorno y pendientes. HU37-01 a HU37-06. | E2E, API, revisión y notas de publicación. |

Cada incremento empieza con una prueba local que falle por el comportamiento
esperado. Registrar el resultado rojo, la causa raíz si falla por otro motivo,
el verde y el mensaje de commit sugerido. Las pruebas de la historia quedan
en el entorno local. Los commits son manuales según AGENTS.md.

## Puntos de control

1. **T37-01 a T37-03.** El alta autorizada consume metadatos verificados,
   conserva duración y orden y deja intacta la base ante entradas inválidas.
2. **T37-04 a T37-06.** Orden, PDF y estado sobreviven a la recarga y
   respetan pertenencia por curso e inscripción.
3. **T37-07 a T37-10.** El instructor prepara el contenido y el colegiado
   lo encuentra desde el aula. Verificar teclado y móvil.
4. **T37-11 a T37-13.** Cobro, vigencia y compatibilidad verificados.
5. **T37-14.** Revisar el recorrido y las condiciones de publicación. Aplicar `definition-of-done.md` y
   `security-checklist.md` y registrar pendientes de publicación.

## Riesgos y condiciones de entrega

| Riesgo | Control previsto |
| --- | --- |
| YouTube cambia visibilidad, cuota o capacidad de inserción | Diferenciar recurso inválido y falla temporal. Confirmar duración y estado con un video no listado controlado. Probar refresco y expiración con reloj inyectable. |
| Un video se cobra o una marca personal altera elegibilidad | Comprobar la política de acceso gratuito al video en escritura y lectura; probar la transición de cobro concurrente. Mantener el seguimiento complementario fuera de HU-19. |
| URL, PDF o identificador ajenos al curso | Destino externo fijo y clave restringida. Validar tipo y tamaño de archivo, pertenencia al curso y permisos de acceso. Evitar detalles de proveedor en errores y logs. |
| Dos instructores o pestañas modifican el orden | Bloquear las escrituras de la colección del curso y comparar la revisión. Preservar los IDs y la posición anterior en conflictos. |
| Datos existentes o vuelta al código previo | Aplicar una migración aditiva en una copia de pruebas. Conservar enlaces y finalizaciones históricas. Al revertir, conservar los SQL aplicados. Después de crear lecciones, mantener un backend que respete la separación de los materiales complementarios. Ensayar una revisión compatible en entorno aislado antes de volver atrás. |

## Retorno de aplicación verificado

El ensayo local del 25/11/2026 utilizó una copia de `3817e1e`, PostgreSQL
y Redis aislados, la migración `0046` y metadatos simulados de YouTube.

- Antes de incorporar lecciones, el backend anterior arrancó al conservar
  `0046` en el catálogo de migraciones. Respondieron la ruta de salud y la
  consulta de lecciones de HU-19.
- Después de incorporar una lección complementaria, esa revisión también
  arrancó, pero ofreció la lección en el editor de evaluaciones de HU-19.
  En esta etapa, el retorno debe mantener un backend con los filtros de
  HU-37 y la protección de cobro.
- Al restablecer el backend de HU-37 sobre la misma base, se recuperaron el
  orden, la duración, la fecha de finalización y el PDF. El editor volvió
  a excluir la lección complementaria. Conservar el catálogo de migraciones
  y los datos durante todo el retorno.

## Aprobación y publicación

La aprobación autoriza lecciones complementarias en cursos con acceso
gratuito al video. Para preparar el destino, configurar el secreto
`youtubeClaveApi` con una clave restringida de YouTube Data API y un clip de
prueba no listado, revisar privacidad y condiciones del portal, obtener una
copia de seguridad y ejecutar el build manual. La prueba del proveedor real,
las migraciones de destino y la publicación siguen pendientes.

### Comprobar YouTube en el entorno local

Configura `youtubeClaveApi` en `backend/.env`. La plantilla
`backend/.env.example` declara la variable vacía. En el entorno local
de verificación, desde la raíz:

```bash
npm exec -w backend -- tsx src/scripts/verificarYoutubeHu37.ts '<URL de prueba>'
```

El script local llama al mismo proveedor que usa el alta y muestra la
duración en segundos. Después de obtenerla, verifica el alta y la
reproducción del clip desde el aula con una cuenta de prueba.

La base etiquetada local es `v3.1.0.0.1`. Una entrega funcional conjunta de
HU-17, HU-19 y HU-37 desde esa base se clasificaría en Función, con propuesta
`v3.2.0.0.0`. Si se publica una base intermedia, recalcular al entregar HU-37.
