# HU-22: catálogo público del CPPP

SCRUM-67, bajo SCRUM-5. El visitante abre `/` o `/capacitaciones` y explora cursos
sin iniciar sesión. La portada presenta fechas, modalidad, horas lectivas y costo
en soles, o «Gratuito». Conserva búsqueda, filtros y paginación. Un curso sin fechas
muestra «Fechas por confirmar»; uno sin cupos muestra «Sin cupos» y no ofrece reserva.

## Elegir e inscribirse

1. Pulsar «Inscribirme» en el curso disponible. Sin sesión se abre el login con
   la selección; con sesión se abre directamente ese curso según los permisos.
2. Iniciar sesión o usar «Crear cuenta». Los enlaces de acceso del formulario y
   del encabezado, errores de validación y recargas conservan el curso elegido.
3. Después del acceso/alta se vuelve al detalle y se consultan las condiciones
   actuales. No se ejecuta una inscripción por iniciar sesión.
4. Confirmar «Inscribirme» en el detalle: gratuito queda confirmado y un curso
   con costo queda «Pendiente de pago». Reintentar no duplica la inscripción.

La cuenta nueva es participante (`AGREMIADO`); no concede rol instructor ni acredita
habilitación del padrón. La confirmación de cobro pertenece a otras historias.
HU-22 no añade pasarelas, transferencias, vouchers ni pagos ficticios a esta rama.

Si se agotan cupos o deja de estar publicado durante el acceso, el servidor decide
el resultado al confirmar. Un curso inexistente/sin permiso muestra su error;
el menú permite volver al catálogo. No se reserva cupo al pulsar el enlace público.

## Consultar constancias

El encabezado sin sesión contiene «Consultar constancias». Abre `/verificar`,
el verificador público HU-20, donde se puede introducir un código. Los QR públicos
siguen abriendo `/verificar/:codigo`. Se conservan válido/anulado/reemplazado y
no encontrado. Este acceso no publica PDFs privados ni autoriza una descarga.

El encabezado conserva «Ir a la web del CPPP», enlazado a
`https://www.cpppregion-cusco.com/`, tanto en celular como en escritorio.

## Privacidad y continuidad de acceso

El catálogo usa `GET /api/publico/cursos`: solo publicados cuya fecha de fin sea
nula o igual/posterior al día de Lima. La lista explícita de campos no publica DNI,
correo/celular particular, alumnos, pagos, asistencia ni materiales. El nombre
profesional del instructor y la información institucional se permiten por acuerdo
del usuario. La privacidad del verificador se mantiene según HU-20.

`curso` es exactamente un identificador decimal positivo de 1–15 dígitos, sin cero
inicial. Duplicados o valores que representen URLs/rutas se descartan. El cliente
construye `/cursos/<id>` localmente, sin aceptar un parámetro de redirección libre.
Login normal conserva inicio por rol; registro sin selección conserva catálogo.

El guard y el interceptor 401 preservan el identificador del curso. También se
conserva al verificar una sesión revocada desde login/registro antes de mostrar el
formulario. Se reconocen las mismas variantes de ruta que el router (mayúsculas,
barras finales y codificación del identificador), manteniendo validación numérica.
El QR de asistencia conserva su ruta/query interna; no se guardan destinos nuevos
ni información personal en almacenamiento adicional.

Se reutiliza `matchRoutes` del router instalado para reconocer rutas en lugar de
mantener un segundo intérprete por expresiones regulares:
[documentación oficial de React Router 7](https://reactrouter.com/7.18.5/api/utils/matchRoutes).

## Verificación local y límites

Los casos cubren acceso/alta, errores, recarga, 401 en detalle y formularios,
selecciones manipuladas, QR, curso inexistente, sesión existente, inscripción
gratuita/reserva y consulta de constancias. Los recorridos reales usan PostgreSQL/
Redis aislados y usuarios sintéticos; no se manipulan datos del CPPP.

El encabezado se verifica con teclado y a 320/360/768/1024/1440 px. El pie tenía una
cuadrícula fija que causaba 240 px de desbordamiento a 1024 px; se usan cuatro columnas
flexibles, conservando su contenido. No se oculta el desbordamiento.

La preparación demo conserva navegación SPA entre cursos creados: MSW almacena
sus fixtures en memoria y una recarga restaura el catálogo inicial. La persistencia
de nuevas inscripciones se comprueba con el servidor real; MSW no la acredita.
Chrome DevTools MCP no está disponible en esta sesión; se usa Chromium/Playwright
aislado, inspección DOM/red, errores de página y capturas para verificar la interfaz.

Los resultados exactos y comandos ejecutados se registran en
[seguimiento HU-22](../../tasks/todo.md#hu-22--scrum-67--revisión-vigente-del-15112026)
y [SPEC](../../SPEC.md#especificación-hu-22-catálogo-público-y-retorno-al-curso).

## Preparación de publicación y recuperación

- Revisar diff, ejecutar build manual y operaciones Git manuales según AGENTS.md.
- Confirmar CI y revisión humana antes de merge; no se hizo push ni despliegue.
- Confirmar servidor, DNS y certificado HTTPS del subdominio elegido. La dirección
  sugerida en requisitos no demuestra que exista un despliegue.
- Configurar SPA fallback para `/login`, `/registro`, `/cursos/:id` y `/verificar`;
  las llamadas `/api` deben llegar al backend real, sin MSW en producción.
- Probar desde el subdominio real el recorrido anónimo→acceso/alta→curso→inscripción,
  caducidad de sesión y consulta pública de constancias. Revisar consola y red.
- Revisar política de cookies/tokens, CSP/HTTPS y dependencias del despliegue según
  DoD/Security Checklist; los controles productivos no se acreditan con pruebas locales.

No hay migraciones ni nuevas dependencias para HU-22. La recuperación consiste en
volver a una entrega compatible de frontend si falla la navegación; inscripciones
ya registradas permanecen en el backend. No borrar cuentas o inscripciones para
revertir la presentación. Acordar responsable y revisar errores401/403/404/409 en
los logs existentes sin añadir datos personales de navegación o tokens a los logs.
