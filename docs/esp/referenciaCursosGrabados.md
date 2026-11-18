# T-24 · Referencias para el diseño de cursos grabados

**Origen** · NR-21 de la reunión con el CPPP, según el encargo de T-24.

**Consulta** · 18 de noviembre de 2026. Guías oficiales, una ficha pública
de curso de PerúEduca y el código de GestionCapa. Los recorridos autenticados
se describen a partir de las guías.

## Patrones adoptados como referencia

| Patrón | Evidencia oficial | Decisión para Figma | Historia |
| --- | --- | --- | --- |
| Módulos — P01 | SIFODS muestra un índice secuencial de actividades y el Programa de Actualización Docente las agrupa en dos módulos. PerúEduca documenta una presentación, módulos numerados y recursos y ofrece cursos con inducción y unidades temáticas. [Navegación SIFODS](https://formacionenservicio.minedu.gob.pe/cursos_2025/recursos/cartilla_preguntas_frecuentes_2025_SIFODS.pdf) · [Programa de Actualización](https://formacionenservicio.minedu.gob.pe/sifods/2025/fondo/NI_PAD_2025.pdf) · [Ingreso a cursos virtuales de PerúEduca](https://repositorio.perueduca.pe/webs/ingresar-cursos-virtuales.pdf) | Índice numerado de módulos. Cada módulo agrupa sus lecciones, materiales y evaluación, cuando corresponda. El agremiado puede identificar qué lección está abierta y desde dónde continuar. | [HU-17](#hu-17) · [HU-37](#hu-37) |
| Barra de avance — P02 | SIFODS documenta marcas de finalización en el índice y un indicador de progreso del curso. La guía de PerúEduca muestra una barra de finalización en el aula de un curso. [Navegación SIFODS](https://formacionenservicio.minedu.gob.pe/cursos_2025/recursos/cartilla_preguntas_frecuentes_2025_SIFODS.pdf) · [Ingreso a cursos virtuales de PerúEduca](https://repositorio.perueduca.pe/webs/ingresar-cursos-virtuales.pdf) | Barra con porcentaje y recuento de actividades completadas, junto con etiquetas textuales por módulo. La barra representa avance académico. La evaluación y la emisión del documento tienen su propio estado. | [HU-17](#hu-17) · [HU-37](#hu-37) |
| Evaluación por módulo — P03 | La ficha de Fundamentos de Inteligencia Artificial de PerúEduca describe dos módulos temáticos con cuestionario en cada uno. El Programa de Actualización de SIFODS documenta una prueba de salida para su certificación. [Ficha de PerúEduca](https://campus.perueduca.pe/course/info.php?id=599) · [Programa de Actualización de SIFODS](https://formacionenservicio.minedu.gob.pe/sifods/2025/fondo/NI_PAD_2025.pdf) | Colocar la evaluación en su módulo y mostrar requisitos, intentos y resultado cuando estén disponibles. Una evaluación de salida puede tener su propio lugar si la historia la requiere. | [HU-38](#hu-38) |
| Constancia descargable — P04 | La cartilla SIFODS explica la descarga de las ofertas aprobadas desde el historial formativo de la cuenta. PerúEduca documenta una sección de constancias con curso, horas, código y acción de descarga tras iniciar sesión. [Constancias de SIFODS](https://formacionenservicio.minedu.gob.pe/cursos_2025/recursos/cartilla_preguntas_frecuentes_2025_SIFODS.pdf) · [Preguntas frecuentes de PerúEduca](https://www.gob.pe/67945-ministerio-de-educacion-preguntas-frecuentes-de-perueduca) | Mostrar el documento disponible en el curso y en el historial personal. Indicar los requisitos pendientes y ofrecer «Descargar constancia» cuando exista un archivo vigente y el usuario tenga permiso. | [HU-37](#hu-37) · [HU-38](#hu-38) |
| Ingreso — P05 | La cartilla SIFODS dirige al docente autenticado al aula y a sus cursos inscritos. La guía de PerúEduca parte de la ficha del curso, solicita acceso y lleva al contenido para iniciar o continuar. [Ingreso en SIFODS](https://formacionenservicio.minedu.gob.pe/cursos_2025/recursos/cartilla_preguntas_frecuentes_2025_SIFODS.pdf) · [Ingreso a cursos virtuales de PerúEduca](https://repositorio.perueduca.pe/webs/ingresar-cursos-virtuales.pdf) | Permitir entrada desde la ficha o «Mis cursos» con el acceso propio del CPPP. Conservar el curso al iniciar sesión y variar la acción según inscripción y progreso. | [HU-44](#hu-44) · [HU-17](#hu-17) |

La barra de la guía de PerúEduca corresponde al aula del ejemplo documentado.
El indicador que aparece en el perfil de esa plataforma mide información
personal completada. Para el CPPP se toma como referencia el indicador del aula.

La ficha de GestionCapa presenta módulos y «Mis cursos» ofrece el acceso al
aula grabada de demostración. El aula registra el avance por actividad.
HU-36 conserva el alta de cursos grabados sin sesiones con fecha y remite
la constancia institucional a HU-37.
[Detalle actual](../../frontend/src/paginas/cursos/DetalleCursoPagina.tsx) ·
[Alcance de HU-36](../../SPEC.md#hu-36-modalidad-por-sesión-y-cursos-híbridos)

## Anotaciones para Figma

| Colocar junto a | Texto para incorporar | Historia |
| --- | --- | --- |
| P01 · Índice del aula | «Agrupar lección y evaluación en módulos numerados. Señalar la actividad actual, las completadas y las bloqueadas. En móvil, colocar el índice debajo de la actividad, como en el prototipo.» | [HU-17](#hu-17) · [HU-37](#hu-37) |
| P02 · Cabecera del aula | «Mostrar el porcentaje junto al recuento. Por ejemplo, 3 de 4 actividades · 75 %. Conservar el avance al volver al curso. La demo guarda el dato por cuenta en el navegador.» | [HU-17](#hu-17) · [HU-37](#hu-37) |
| P03 · Evaluación del módulo | «Habilitar la evaluación al completar la lección del módulo. Mostrar el resultado y permitir otro intento tras una respuesta incorrecta. Mostrar nota mínima y límite de intentos cuando el CPPP los defina.» | [HU-38](#hu-38) |
| P04 · Cierre e historial | «En la demo, habilitar la descarga de la constancia al completar las cuatro actividades. En el diseño institucional, distinguir preparación, retención cuando corresponda y disponibilidad del documento para su titular.» | [HU-37](#hu-37) · [HU-38](#hu-38) |
| P05 · Ficha, inicio de sesión y Mis cursos | «Conservar el curso elegido durante el inicio de sesión. Mostrar Inscribirme antes de confirmar la inscripción y Abrir aula grabada después. Ofrecer la misma entrada desde Mis cursos. En ofertas con pago previo, mostrar el estado y la acción de pago.» | [HU-44](#hu-44) · [HU-17](#hu-17) |

Usar etiquetas y estados que se puedan distinguir sin color. Las historias
de implementación definen el cómputo del avance, los requisitos académicos
y las condiciones de emisión institucional.

## Historias de referencia

Los enlaces de la matriz apuntan a estas fichas de trazabilidad local. Los
IDs provienen de T-24. HU-37 tiene trazabilidad adicional en HU-36. Los
enlaces de Jira y el alcance literal de las otras tres historias requieren
confirmación del equipo.

### HU-17

Asignación propuesta para P01, P02 y P05. Sirve de referencia para
organizar y retomar el contenido desde «Mis cursos». El recorrido de entrada
y el detalle con módulos existen en la aplicación.
[Mis cursos](../../frontend/src/paginas/participante/MisCursosPagina.tsx) ·
[Detalle del curso](../../frontend/src/paginas/cursos/DetalleCursoPagina.tsx)

### HU-37

P01, P02 y P04 vinculan lecciones en video, finalización del curso grabado y
su constancia. HU-36 deriva a HU-37 las lecciones y la emisión pendiente.
La barra y el detalle del historial son propuestas de esta revisión.
[Alcance de HU-36](../../SPEC.md#hu-36-modalidad-por-sesión-y-cursos-híbridos) ·
[Reglas de constancias](certificados.md)

### HU-38

Asignación propuesta para P03 y la elegibilidad académica de P04. Ubica el
cuestionario y su resultado dentro del módulo. Nota, intentos y efecto en
la constancia quedan para validar con la historia y el CPPP.
[Requisitos RF-20 y RF-21](../enfoqueCppp.md#requisitos-funcionales)

### HU-44

Asignación propuesta para P05. Vincula el acceso al aula con la sesión
institucional, la conservación del curso elegido y el acceso confirmado.
[Rutas de acceso](../../frontend/src/rutas.tsx) ·
[Retorno al curso](../../frontend/src/lib/retornoCurso.ts)

## Pautas del CPPP y estado de Figma

El encargo aporta la referencia NR-21. Las pautas del colegio sobre su uso
de las plataformas quedan pendientes de recepción. Al recibirlas,
registrar su fecha y procedencia y vincular la decisión afectada a P01–P05.
Quedan por confirmar el ingreso habitual, los requisitos académicos y
la forma de obtener constancias.

El nodo `4:52` corresponde al sistema de diseño. Las cinco anotaciones se
registraron como texto editable en un marco de la página «Escritorio», con
los IDs de historia y enlaces a la ficha, el historial y la página pública.
Figma restringe las anotaciones nativas para la cuenta conectada.
[Marco T‑24 en Figma](https://www.figma.com/design/ORSusbg35vcu0nUEz4o08q/GestionCapa?node-id=262-2950) ·
[Contrato local de pantallas](pantallas-figma.md)

El sitio Jira autorizado devolvió 404 para `SCRUM-160` y no ofreció el
proyecto `SCRUM`. Los vínculos de la matriz llevan a las referencias locales
hasta que estén disponibles las fichas oficiales.

## Prototipo en GestionCapa

Ejecuta `npm run dev:demo` y abre el curso «Retroalimentación que ayuda a
aprender» desde el catálogo. Ingresa con la cuenta de agremiado de la demo,
confirma la inscripción y selecciona «Abrir aula grabada». Después puedes
retomar el curso desde «Mis cursos».

El aula muestra dos módulos, cada uno con un video breve, su resumen y una
evaluación. Completar una actividad habilita la siguiente. Una respuesta
incorrecta permite volver a intentarlo. El navegador guarda el avance para
cada cuenta de demostración y habilita la constancia PDF al completar las
cuatro actividades. La constancia se identifica como documento sin validez
oficial. El curso de ejemplo conserva su programa fijo y es gratuito.
[Página del aula](../../frontend/src/paginas/cursos/AulaGrabadaPagina.tsx)
