# HU-14: Catálogo de cursos para colegiados

El colegiado abre **Catálogo de cursos** para buscar por nombre, combinar filtros
por modalidad y categoría y recorrer resultados paginados. Cada tarjeta muestra
descripción, instructor, fechas, horas lectivas, modalidad, costo y cupos
**disponibles**. El enlace del título abre el detalle, módulos y materiales.

## Criterios y comportamiento

- Solo aparecen cursos `PUBLICADO` de la organización de la sesión. Los borradores
  no se incluyen en resultados, totales ni categorías. Consultar directamente un
  borrador como colegiado sigue devolviendo 403.
- Buscar coincide con una parte literal del nombre, sin distinguir mayúsculas ni
  tildes. `%` y `_` se buscan literalmente, no como comodines SQL.
- Modalidad y categoría se combinan con la búsqueda. Las categorías proceden de
  los cursos publicados de la organización. El formulario del administrador
  permite indicar categoría; el valor predeterminado es `General`.
- Se muestran seis cursos por página. Cambiar búsqueda o filtros vuelve a la
  primera página. La URL conserva filtros y página para navegación y recarga.
  La pantalla informa cuando no hay resultados y permite limpiar filtros.
- Fechas de inicio y fin se guardan como fechas de calendario. Ambas son opcionales
  por compatibilidad con cursos anteriores; si se indica una, se requieren ambas
  y la final no puede ser anterior. Si faltan se muestra **Fechas por confirmar**.
- Cupos disponibles = máximo entre cero y cupos totales menos inscripciones.
  Las inscripciones terminadas también ocupan su plaza en esa edición del curso.
- Si no hay plazas se muestra **Sin cupos** y el botón de inscripción está
  deshabilitado. Un POST directo también recibe 409 `SIN_CUPOS`.
- La inscripción básica es del propio colegiado autenticado; no acepta elegir
  otro usuario. Solo admite cursos publicados de su organización. El curso se
  bloquea durante la transacción para evitar sobrepasar la última plaza ante
  solicitudes simultáneas. Repetir la inscripción devuelve 200 sin duplicar ni
  modificar el estado de una inscripción ya terminada.
- Una inscripción nueva queda `EN_CURSO`, aparece en el historial y se vincula a
  las sesiones programadas ya asociadas al curso para permitir asistencia QR.
  La inscripción **no cobra ni procesa pagos**. La interfaz lo indica en cursos
  de pago; pagos y validación financiera requieren su propia historia.

El administrador configura categoría y fechas desde **Crear curso**. El costo,
modalidad, instructor y capacidad total conservan las validaciones de HU-13.
El catálogo y las pantallas de gestión siguen separados.

## API

La ruta anterior `GET /api/catalogo/cursos` conserva su respuesta de lista para
compatibilidad. La interfaz utiliza la nueva ruta paginada:

```text
GET /api/catalogo/cursos/pagina?buscar=docencia&modalidad=VIRTUAL&categoria=Educación&pagina=1&tamanoPagina=6
```

Todos los parámetros son opcionales. Página inicial 1, tamaño predeterminado 6 y
máximo 50. Los valores inválidos responden 422. Se ordena por identificador
numérico descendente para mantener un orden definido. La respuesta contiene:

```json
{
  "items": [],
  "total": 0,
  "pagina": 1,
  "tamanoPagina": 6,
  "totalPaginas": 0,
  "categorias": []
}
```

Cada curso incluye `categoria`, `fechaInicio`, `fechaFin`, `cuposDisponibles` e
`inscrito`, además de los campos anteriores. Resultados, total y categorías se
consultan en un mismo snapshot. Una página fuera del total devuelve `items: []`;
la interfaz permite volver a la primera página. Los resultados paginados se envían
con `Cache-Control: private, no-store` porque incluyen el estado de inscripción.

```text
POST /api/cursos/:id/inscribirme
```

Solo `PARTICIPANTE`: 201 nueva inscripción, 200 si ya existía; 401 sin sesión,
403 para otro rol u organización, 404 si no existe, 409 para borrador o falta de
cupos. La respuesta contiene `cursoId`, `estado` y `yaInscrito`. No se emiten
certificados como consecuencia de inscribirse.

## Preparación y datos demo complementarios

Aplicar `0009-catalogoCursos.sql` mediante `npm run migrate` y ejecutar
`npm run seed`. La migración añade los metadatos y completa esas columnas nuevas
en los tres cursos demo anteriores; no cambia sus títulos, cupos ni inscripciones.
El seed conserva las ediciones existentes y añade **Demo · Taller con cupos
agotados**, publicado, con una plaza ocupada por Luz. María puede usarlo para
comprobar el bloqueo. El modo demo MSW incluye los mismos casos.

Los cursos nuevos sin fechas muestran «Fechas por confirmar»; las semillas
incluyen fechas para explorar las tarjetas. No se crean datos demo en producción.

## Verificación

- Integración PostgreSQL: búsqueda, filtros, páginas sin duplicados, metadatos,
  borradores, organizaciones, parámetros inválidos, cupos, inscripciones
  simultáneas, idempotencia, sesiones e historial.
- E2E real y demo a 360 px: ocho cursos publicados para recorrer dos páginas,
  filtros combinados, fechas y descripciones, borrador oculto, bloqueo del curso
  lleno e inscripción visible en el historial. La prueba real también recarga
  la página y verifica que se conserve la navegación.
- Regresión HU-13 adaptada a buscar el curso publicado sin depender de la primera
  página del catálogo. El seed mantiene pruebas de repetición y concurrencia.

```bash
npm run typecheck
npm run e2e:tipos
# Desde backend/, con base de pruebas preparada:
NODE_ENV=test DB_NAME=gestioncapa_e2e node --import tsx --test test/integracion/catalogo.test.ts
# Desde raíz, sin otras pruebas usando gestioncapa_e2e en paralelo:
npm exec -- playwright test --config playwright.real.config.ts e2e/prb/real/catalogo.spec.ts
npm exec -- playwright test e2e/prb/demo/catalogo.spec.ts --project=movil
```

El build queda para ejecución manual del usuario.
