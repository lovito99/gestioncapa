# HU-13: Crear curso con módulos y material

El administrador crea cursos de su organización desde **Mis cursos → Crear
curso**. El instructor asignado agrega material desde **Mis cursos**. Los
colegiados consultan los publicados desde **Catálogo de cursos**.

## Reglas

- El curso se crea siempre en `BORRADOR`. El cliente no puede enviar un estado.
- Los módulos se guardan en el orden del formulario; las flechas permiten
  reordenarlos antes de guardar. Se requiere al menos un módulo.
- Solo un administrador de la misma organización publica. Repetir la publicación
  conserva el mismo curso y su primera fecha de publicación.
- El catálogo requiere sesión y muestra únicamente cursos `PUBLICADO` de la
  organización del usuario. Un borrador solo es visible para su administrador
  y el instructor asignado.
- El instructor debe estar activo y pertenecer a la organización. Otro instructor,
  un colegiado o un administrador no pueden agregar material: reciben 403.
- Horas lectivas obligatorias, mayores que cero y hasta 10000. Se conservan en
  el curso para su uso posterior en certificados y HU-34.
- Modalidad: presencial, virtual o híbrida. Costo en soles no negativo, con hasta
  dos decimales; cupos enteros positivos.
- Tipo de certificado obligatorio: participación o aprobación. Nota mínima
  entre 0 y 20; si se omite se guarda 14. No se reemplaza una nota explícita de 0.
- Material: archivo PDF de hasta 5 MiB, enlace HTTPS o video mediante URL HTTPS
  sin credenciales. Los archivos se guardan en PostgreSQL; la descarga requiere
  sesión y autorización sobre el curso. El servidor no descarga ni procesa
  contenido de URLs externas. La lectura valida la cabecera PDF y el tamaño.
- Los módulos de un curso publicado también admiten material del instructor
  asignado. El contenido publicado es consultable por los usuarios autenticados
  de su organización; la inscripción, pago y restricción de contenido por compra
  no forman parte de esta historia.

La creación de curso y módulos es transaccional. Los datos inválidos responden
422 sin dejar cursos parciales. Las restricciones principales también están
presentes en la base de datos.

## Preparación y rutas

Aplicar la migración `0006-cursosConModulos.sql` con `npm run migrate` antes de
iniciar el backend. No cambia clases, reuniones ni asistencias existentes.
El build lo ejecuta manualmente el usuario.

| Método | Ruta bajo /api | Acceso |
| --- | --- | --- |
| GET | /cursos/instructores | Admin: instructores activos de su organización |
| POST | /cursos | Admin: crear borrador y módulos |
| GET | /cursos | Admin: todos los propios; instructor: asignados |
| GET | /catalogo/cursos | Autenticado: publicados de su organización |
| GET | /cursos/:id | Según visibilidad del curso |
| POST | /cursos/:id/publicar | Admin de su organización |
| POST | /cursos/:id/modulos/:moduloId/materiales | Instructor asignado |
| GET | /cursos/:id/modulos/:moduloId/materiales/:materialId/archivo | Según visibilidad del curso |

Ejemplo de creación (identificador de instructor real):

```json
{
  "titulo": "Formación docente",
  "descripcion": "Curso para colegiados",
  "instructorId": "12",
  "horasLectivas": 24,
  "modalidad": "VIRTUAL",
  "costo": 150.5,
  "cupos": 30,
  "tipoCertificado": "APROBACION",
  "modulos": [{ "titulo": "Introducción" }, { "titulo": "Práctica" }]
}
```

En la respuesta, `notaMinima` es 14, `estado` es `BORRADOR` y cada módulo contiene
su `id`, `orden` (desde 1) y lista `materiales`.

Material por URL: `{ "titulo": "Referencia", "tipo": "ENLACE", "url": "https://…" }`.
Para video usar `tipo: "VIDEO"`. Para PDF enviar `titulo`, `tipo: "PDF"` y
`contenidoBase64` (base64 canónico sin prefijo data URL). La interfaz lee el
archivo seleccionado y prepara ese cuerpo automáticamente. Las consultas no
incluyen los bytes del archivo; se descargan por la ruta autorizada.

## Verificación

- `backend/test/integracion/cursos.test.ts`: persistencia, orden, valores por
  defecto, publicación, validación, aislamiento entre organizaciones, permisos,
  PDF, enlaces, videos y rechazo de material inválido.
- `e2e/prb/real/cursos.spec.ts`: creación desde formulario a 360 px, reordenamiento,
  borrador oculto, publicación, carga y descarga de PDF, enlace y video por el
  instructor y consulta como colegiado contra el backend real.
- `e2e/prb/demo/cursos.spec.ts`: el mismo recorrido en modo demo. Los datos demo
  de cursos se reinician al recargar la página; la persistencia real usa PostgreSQL.

```bash
npm run typecheck
npm run e2e:tipos
# Desde backend/, usando una base de pruebas previamente preparada:
NODE_ENV=test DB_NAME=gestioncapa_e2e node --import tsx --test test/integracion/cursos.test.ts
# Desde la raíz:
npm exec -- playwright test --config playwright.real.config.ts e2e/prb/real/cursos.spec.ts
npm exec -- playwright test e2e/prb/demo/cursos.spec.ts --project=movil
```

Los E2E reales usan exclusivamente `gestioncapa_e2e`. El preparador existente
reinicia sus clases; ejecutar las suites reales sin otros procesos de prueba
sobre esa misma base. Los cursos creados por E2E permanecen como datos de prueba.

## Cursos demo precargados

`npm run migrate` y `npm run seed` preparan estos datos con el backend real
fuera de producción. En `npm run dev:demo` ya vienen cargados en memoria.

| Curso | Instructor | Estado inicial | Horas / costo / certificado |
| --- | --- | --- | --- |
| Demo · Seguridad y primeros auxilios | Carlos Mendoza | Publicado | 24 h / S/ 150 / Aprobación, nota 14 |
| Demo · Didáctica y evaluación | Lucía Paredes | Publicado | 16 h / Gratis / Participación |
| Demo · Herramientas digitales para docentes | Carlos Mendoza | Borrador | 20 h / S/ 120 / Aprobación, nota 16 |

Cada curso contiene dos módulos en orden y tres materiales: guía PDF descargable,
un enlace de referencia y un video de prueba identificado como tal. Son ejemplos
para explorar el producto, no contenido formativo oficial.

- Administrador: ingresar con la cuenta `ADMIN_EMAIL` y clave configuradas en
  `backend/.env`, abrir **Mis cursos**, revisar el borrador y pulsar **Publicar
  en catálogo**. En modo demo: `admin@gestioncapa.local` / `demo123`.
- Carlos: `carlos.mendoza@organizacion.pe` / `demo123`, abrir **Mis cursos** y
  agregar PDF, enlaces o videos a sus dos cursos.
- Lucía: `lucia.paredes@organizacion.pe` / `demo123`, abrir **Mis cursos** para
  ver únicamente su curso asignado. No puede modificar los de Carlos.
- Colegiado: `maria.quispe@demo.pe` / `demo123`, abrir **Catálogo de cursos**:
  inicialmente aparecen dos cursos; el borrador aparece al publicarse.

La migración `0007-identidadCursosDemo.sql` da a las semillas una identidad que
no depende del título editable. Repetir el seed no duplica ni sobrescribe títulos,
estados, notas, módulos o materiales existentes. No repone material eliminado
de un curso ya sembrado. En producción no crea cursos, módulos ni materiales demo.
Las credenciales demo solo se usan fuera de producción. El modo demo en memoria
se restaura al recargar; el backend real conserva los cambios.
