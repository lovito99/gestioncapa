# HU-37 · Agregar lecciones en video a un curso grabado

**Estado:** aprobada e implementada. Verificación con YouTube real y build pendientes. Base local `3817e1e`. Sprint Aprendizaje,
número y clave Jira pendientes de confirmación.

## Objetivo

El instructor asignado incorpora lecciones de YouTube no listadas a un
curso grabado, organiza el orden de todo el curso y adjunta material de
lectura. Un colegiado con acceso vigente abre «Mis cursos», entra al aula grabada
y consulta duración, estado y PDF por lección. Se aplican las reglas de acceso
del curso durante el período vacacional y el resto de su vigencia.

## Capacidades

| Capacidad | Resultado | Depende de |
| --- | --- | --- |
| Fuente de video | Obtener en el servidor la condición de reproducción y la duración oficial | YouTube Data API v3 |
| Autoría de lecciones | Guardar orden global, material PDF y permisos por curso | Fuente verificada, catálogo de materiales e inscripción |
| Consulta y seguimiento | Abrir el video, descargar el PDF y conservar el estado personal | Autoría, aula de HU-17 y acceso vigente |

## Estado del repositorio

| Área | Disponible | Diferencia para HU-37 |
| --- | --- | --- |
| Alta de video | El instructor asignado puede agregar un material `VIDEO` HTTPS dentro de un módulo. Existen enlaces históricos de YouTube y un formulario reutilizable. [Servicio de cursos](../../../../../backend/src/services/cursos/cursosService.ts) · [Formulario de material](../../../../../frontend/src/paginas/cursos/DetalleCursoPagina.tsx) | La URL genérica no comprueba si existe el video, si es no listado o si permite inserción. |
| Orden | `modulos_curso` guarda un orden único por curso. Los materiales se leen por ID dentro del módulo. [Esquema](../../../../../backend/migraciones/0006-cursosConModulos.sql) · [Consulta de materiales](../../../../../backend/src/repositories/cursos/cursosRepository.ts) | Las lecciones necesitan una posición persistida en el orden global del curso. |
| PDF | Hay validación de tamaño, codificación y cabecera PDF de hasta 5 MB, descarga autenticada y un ayudante de descarga en React. [Validación](../../../../../backend/src/dto/cursos/cursoDto.ts) · [Servicio web](../../../../../frontend/src/servicios/cursos.ts) | El archivo hoy pertenece al módulo. La lección necesita un vínculo explícito con su PDF. |
| Aula y progreso | HU-17 mide archivos HTTPS directos en el reproductor HTML y comparte finalizaciones con HU-19. Las fuentes externas pueden aparecer como enlaces y las salidas anteriores conservan sus lecciones. [HU-17](../hu-17/SPEC.md) · [HU-19](../hu-19/SPEC.md) | El iframe de YouTube tiene controles propios. Sus lecciones complementarias necesitan estados de la plataforma separados de la acreditación académica y de las marcas históricas. |
| Alcance histórico | HU-36 y T-24 asociaban HU-37 con la emisión futura en grabados. HU-19 ya implementó la salida oficial y la certificación. [Trazabilidad](../../../referenciaCursosGrabados.md#hu-37) · [Reglas HU-19](../hu-19/SPEC.md) | Los criterios actuales de HU-37 cubren autoría y consulta de contenido. Se conservan las reglas de emisión de HU-19. |

## Reglas de funcionamiento

1. **Autoría y orden.** El instructor asignado añade título, módulo y enlace en
   un curso `GRABADO` abierto. El alta deja la lección al final. El instructor
   reordena las lecciones del curso con «Subir» y «Bajar» y confirma la lista.
   El servidor guarda una permutación completa con revisión de orden. Ante
   un cambio concurrente, devuelve un conflicto y permite recargar el orden
   vigente. Los IDs, módulos, PDF y estados personales permanecen asociados.
2. **URL y duración.** Aceptar HTTPS de `youtube.com` en formato `/watch` y
   `youtu.be` con un ID válido, con variantes de host explícitas. Normalizar
   por ID de video y omitir parámetros de seguimiento. El servidor comprueba
   por `videos.list` que el recurso sea no listado, esté procesado, permita
   inserción y tenga duración positiva en ISO 8601. Las listas sin video,
   emisiones en vivo o programadas y fuentes con restricciones que impidan
   la reproducción prevista se rechazan con un mensaje orientado a corregir
   el enlace. Al recibir una falla temporal, cuota agotada o configuración
   ausente, mostrar un mensaje de reintento y dejar el alta sin persistir.
   Una respuesta válida puede seguir encontrando restricciones por país
   o titular de derechos durante la reproducción. [Método videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list) · [Recurso videos](https://developers.google.com/youtube/data/reference/rest/v3/videos)
3. **Material.** Cada lección admite un PDF opcional de hasta 5 MB,
   adjuntable después de guardar la lección. El backend comprueba curso,
   módulo, lección y archivo. La descarga usa la política del contenido
   privado, se entrega como archivo y valida acceso en cada solicitud.
4. **Presentación y estado.** El aula muestra el índice ordenado, la duración
   en minutos y segundos o en horas cuando corresponda, el PDF y el estado
   del titular. «Pendiente» antes de abrir, «En curso» al abrir desde la
   plataforma y «Completada» con una marca explícita del colegiado. La marca
   es idempotente, se conserva al volver, se guarda con fecha del servidor
   y se presenta como seguimiento de GestionCapa. El iframe oficial
   mantiene sus controles y se carga al solicitar el video. En destino se
   verifica el tamaño mínimo del iframe y el Referer requerido por YouTube,
   habilitando el dominio del reproductor en la política de contenido si hace
   falta. Descargar el PDF conserva el estado actual.
5. **Integración con HU-17 y HU-19.** La integración usa YouTube como lección
   complementaria. Su estado personal queda fuera de los segundos y el
   porcentaje de HU-17 y de los requisitos de salida o certificación de
   HU-19. Los videos directos mantienen su avance acreditado y las salidas
   publicadas conservan sus lecciones históricas. El flujo genérico de nuevo
   material redirigirá las altas nuevas de YouTube en grabados al formulario
   de HU-37. Los enlaces históricos se conservan. Si el equipo requiere
   acreditar estas lecciones, deberá confirmar el uso admitido por YouTube
   y revisar el criterio académico antes de implementar esa extensión.
   [Reproductor oficial](https://developers.google.com/youtube/terms/required-minimum-functionality) · [Política sobre datos y métricas](https://developers.google.com/youtube/terms/developer-policies#e-handling-youtube-data-and-content)
6. **Acceso y política de cobro.** Se admiten cursos donde el video
   se ve sin pagar, por ejemplo `GRATUITO` y `CERTIFICADO` cuando el cobro
   solo condiciona la entrega del documento. Rechazar el alta en cursos
   `PREVIO` y el cambio a esa modalidad si dejaría videos integrados detrás
   del pago. El mismo control considera inscripciones vigentes que mantienen
   una condición de pago previo histórica. Aplicar el acceso vigente tanto en el índice como en la
   descarga y el seguimiento. Un enlace no listado se puede compartir
   fuera de GestionCapa por quien lo conozca. [Política de reproducción](https://developers.google.com/youtube/terms/developer-policies#f-user-experience) · [Privacidad de videos](https://support.google.com/youtube/answer/157177?hl=es-419)
7. **Vigencia.** Guardar el ID aportado por el instructor y los datos propios
   de la lección. La duración y disponibilidad consultadas se mantienen
   con fecha de verificación, se refrescan con una consulta por lote y se
   eliminan al vencer el límite de 30 días desde la verificación. Si falla el
   refresco, dejar de servir los metadatos caducados y mostrar la lección como no disponible
   para reproducción, conservando orden, material y estado académico propio.
   Revisar privacidad, condiciones de uso, identificación del cliente y
   tratamiento de videos marcados para niños antes de activar la integración
   en destino. [Políticas de conservación y privacidad](https://developers.google.com/youtube/terms/developer-policies)

## Criterios de aceptación

| ID | Verificación |
| --- | --- |
| HU37-01 | En un curso grabado abierto, el instructor asignado guarda un enlace a un video no listado válido. Se crea una lección al final del orden del curso con ID estable, título, módulo y duración. Un instructor ajeno recibe 403. |
| HU37-02 | Al reordenar tres lecciones de dos módulos, el orden se conserva al recargar como instructor y como colegiado. Reenviar una lista obsoleta, duplicada o con una lección ajena conserva el orden vigente y produce un error. |
| HU37-03 | Una URL inválida, un destino fuera de los casos admitidos o un video inaccesible producen un mensaje claro y dejan la lista intacta. Los fallos transitorios ofrecen reintento. |
| HU37-04 | Un PDF válido y vinculado se descarga desde esa lección por el colegiado con acceso. Un PDF inválido o de más de 5 MB se rechaza. El enlace de descarga requiere acceso cada vez. |
| HU37-05 | Con respuesta válida de YouTube, se guarda y se muestra automáticamente la duración, también para videos de más de una hora. La duración procede del proveedor y el formulario carece de entrada manual para ese dato. |
| HU37-06 | En «Mis cursos», el colegiado con acceso abre el aula y encuentra las lecciones en orden, duración y estado propio. Luego de abrir, marcar completada y recargar, los estados se conservan por cuenta. La salida HU-19 sigue usando sus requisitos previos. |

## Contratos y límites

- Mantener Fastify, Zod, PostgreSQL, React y React Query. Reutilizar
  `materiales_curso` como almacenamiento del video y PDF. Añadir mediante
  migración aditiva una relación de lección con el curso, el material de
  video y el PDF opcional. El orden es único por curso y se escribe en
  transacción. El estado personal se vincula a la inscripción.
- El cliente del proveedor hace una consulta autenticada con clave del
  servidor a un destino fijo con timeout. Envía el ID validado, nunca la URL
  que escribió el usuario. Aplicar cuotas, verificar asignación y política de
  cobro antes de llamar al proveedor y repetir la verificación dentro de la
  escritura. Los errores públicos no incluyen claves, URLs completas ni
  cuerpos del proveedor. [Credenciales de Google](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)
- Índice privado y respuestas por cuenta con `Cache-Control: private, no-store`.
  Catálogo público sin IDs de video ni enlaces a recursos privados. Mantener
  el título introducido por el instructor como dato propio, con identificación
  del proveedor para la duración del video y del portal para el seguimiento.
- Ubicaciones candidatas: dominio, DTO, proveedor, repositorio y controlador
  en las capas de `backend/src`. Gestión en la ficha de cursos e índice en la
  entrada existente de `frontend/src/paginas/cursos/avance`. Tipos en
  PascalCase y funciones, variables y archivos nuevos sin guiones bajos.
- La aprobación del plan debe incluir restricciones de cobro, finalización
  complementaria y migración. Otro paquete, escucha de eventos de YouTube o
  un cambio de CI requieren revisión del alcance. Se excluyen subida de
  videos a YouTube, descarga de videos, modificaciones de reproducción,
  nuevos criterios de certificados y migración masiva de enlaces históricos.

## Estrategia de verificación

| Verificación tras aprobación | Comando o entorno |
| --- | --- |
| Dominio, permisos, compatibilidad y arquitectura | `npm test -w backend` y `NODE_ENV=test npm run test:integracion` en PostgreSQL/Redis aislados |
| Formularios, estados, orden y accesibilidad | `npm test -w frontend` y pruebas locales de teclado y móvil |
| Navegador con proveedor simulado y regresiones de HU-17/HU-19 | `npm run e2e:real` con base E2E aislada. Un video controlado del proyecto y credencial autorizada verifican después el contrato con Google y el iframe en destino. |
| Tipos y lint | `npm run typecheck`, `npm run e2e:tipos` y `npm run lint -w frontend` |
| Build | `npm run build`, a cargo del usuario |

Las pruebas específicas de la historia se conservarán localmente, siguiendo
la indicación anterior del usuario sobre archivos de pruebas. Se registrará
la evidencia rojo y verde en el seguimiento.

## Soluciones existentes

Consulta del 25/11/2026. Canales revisados: `frontend/src`, `backend/src`,
Astryx CLI/Core 0.7.16, registro público npm, documentación oficial de YouTube,
GitHub público mediante API y catálogo de MCP y skills. Sin GitHub CLI ni
búsqueda autenticada de código. El inventario no ofrece un MCP de YouTube
o Chrome DevTools. La consulta del proveedor con una clave y un video
controlado queda pendiente de autorización y configuración.

| Capacidad | Candidatos y evidencia | Decisión |
| --- | --- | --- |
| Validar enlace y obtener duración | El repo usa Zod, URL nativa y `fetch` con timeout en proveedores. `@googleapis/youtube` 40.1.0, Apache-2.0, publicado en noviembre de 2026, depende de `googleapis-common`. `iso8601-duration` 2.2.0, MIT, octubre de 2026, cero dependencias, cubre una gramática más amplia que el formato necesario. [SDK Google](https://github.com/googleapis/google-api-nodejs-client/tree/main/src/apis/youtube) · [ISO8601-duration](https://github.com/tolu/ISO8601-duration) | **Componer** un proveedor con `fetch`, URL y Zod y un parser pequeño para los días, horas, minutos y segundos documentados por el proveedor. Adoptar el método oficial `videos.list`. |
| Conservar orden y evitar conflictos | PostgreSQL y `conTransaccion` ya están en uso. Astryx `List` ofrece reordenamiento con teclado y puntero. `@dnd-kit/react` 0.5.3, MIT, octubre de 2026, cuatro dependencias directas y pares React. `@atlaskit/pragmatic-drag-and-drop` 4.0.0, Apache-2.0, septiembre de 2026, tres dependencias directas. [dnd-kit](https://github.com/clauderic/dnd-kit) · [Pragmatic Drag and Drop](https://github.com/atlassian/pragmatic-drag-and-drop) | **Componer** lista local, acciones accesibles y transacción. El arrastre es opcional para este caso y ambas bibliotecas siguen necesitando persistencia propia. |
| Adjuntar y descargar PDF | `esquemaMaterial`, `leerPdfBase64` y `descargarMaterialPdf` ya cubren formato, tamaño y descarga. Astryx `FileInput` aporta patrones de validación visible. `pdf-lib` 1.17.1, MIT, ya instalado en backend y con última publicación de 2021, está orientado a crear o editar PDF y trae cuatro dependencias directas. [pdf-lib](https://github.com/Hopding/pdf-lib) | **Extender** la validación y entrega existentes con la relación de lección. El flujo conserva los bytes del archivo. |
| Mostrar formulario, índice y estados | Astryx `course-detail`, `List`, `TextInput`, `FileInput`, `Badge`, `Banner` y `Button` se consultaron como referencia. Core 0.7.17 en npm, MIT, noviembre de 2026, requiere `intl-messageformat` y pares React/StyleX. El repo ya tiene `Campo`, `Entrada`, `Boton`, `Aviso` y `Etiqueta`. [Astryx](https://github.com/meta/astryx) | **Extender** el aula y la ficha con los controles locales y los patrones de accesibilidad consultados. |
| Reproducir y reflejar el estado propio | El iframe oficial incluye controles y capacidades del proveedor. `react-player` 3.4.0, MIT, noviembre de 2025, diez adaptadores directos y actividad de repositorio en 2026. `react-youtube` 10.1.0, MIT, noviembre de 2022, tres dependencias directas. [ReactPlayer](https://github.com/cookpete/react-player) · [React YouTube](https://github.com/tjallingt/react-youtube) | **Adoptar** el iframe oficial y **construir** el seguimiento de GestionCapa con eventos propios. La actividad académica queda asociada a la inscripción. |
| Verificar y operar | `node:test` incluido en Node, Vitest MIT y Playwright Apache-2.0 ya instalados. Revisión con las skills de API, TDD, frontend y seguridad y las referencias de calidad del proyecto. [Playwright](https://github.com/microsoft/playwright) | **Adoptar** las suites existentes, simulación HTTP y prueba controlada de YouTube. |

La propuesta utiliza las dependencias actuales del proyecto. El [plan](plan.md)
y el [seguimiento](todo.md) registran implementación y verificaciones.
