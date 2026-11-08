# HU-20: constancias con QR (Sprint 2)

Fuente: reglas v2 del 31/10/2026 y criterios de HU-20 proporcionados por el usuario.
Se implementa el Sprint 2: constancia presencial sin examen, 80 % de sesiones,
cierre, excepción, PDF, verificación pública, anulación y corrección del nombre.
Las firmas son genéricas de demostración, por indicación expresa del usuario.

## Alcance y reglas

- Solo se emiten automáticamente constancias de cursos **presenciales gratuitos**
  de participación. Aprobación, grabados y programas siguen en sus sprints.
- El administrador cierra un curso publicado después del fin de todas sus sesiones
  no canceladas y dentro de los siete días siguientes a la última sesión.
- Se requiere al menos el 80 % real: `presentes * 100 >= sesiones * 80`. No se
  redondea una asistencia insuficiente para conceder una constancia. Cero sesiones
  o sesiones futuras impiden cerrar; las canceladas se excluyen.
- El cierre marca terminado el curso y las inscripciones confirmadas. Quien tiene
  70 % no recibe documento y «Mis cursos» explica la asistencia que le falta.
- El cierre es transaccional y repetible: bloquea el curso, conserva documentos
  existentes y no genera otro código al reintentarlo. Un curso cerrado no se vuelve
  a publicar ni admite cambios normales de sus sesiones.
- La excepción requiere un motivo no vacío, un inscrito del curso y administrador
  de la misma organización. Puede enviarse durante el cierre o después de cerrarlo.
- Los cursos con costo no se certifican mientras falte la confirmación real de
  HU-32: no se interpreta una inscripción como pago ni se modifica `PENDIENTE_PAGO`.
  El backend responde `409 CERTIFICACION_FUERA_ALCANCE` con una explicación.

## PDF de demostración

Los PDF llevan logo CPPP, nombre completo, DNI parcialmente oculto, tipo, curso,
modalidad, horas lectivas, fechas, fecha de emisión, código aleatorio de 128 bits,
QR y espacios identificados como firmas genéricas. Las fuentes DejaVu se incluyen
para renderizar el texto sin depender del visor. Su licencia está en
`backend/assets/licenciaDejaVu.txt`.

Todos los documentos nuevos y su verificación indican **DEMO / SIN VALIDEZ OFICIAL**.
No son firmas auténticas del Decano ni del instructor. Para emitir documentos
oficiales habrá que sustituir el tratamiento de firmas genéricas por los recursos
institucionales autorizados y validar la plantilla; no basta con quitar la leyenda.

El código usa `crypto.randomBytes(16)` y una restricción única en la base. El PDF
se guarda con su fotografía de datos en la misma transacción que el certificado
y la auditoría. Las descargas repiten los mismos bytes; no regeneran el archivo.

El QR usa `FRONTEND_URL` y `/verificar/:codigo`. Configurar el dominio correcto
antes de emitir: los archivos guardados conservan la URL con la que se crearon.
Una mudanza de dominio requiere conservar el acceso a los enlaces anteriores.
Los certificados no tienen fecha de vencimiento.

## Verificación, privacidad y permisos

`GET /api/certificados/:codigo` es público y devuelve exclusivamente código,
estado, reemplazo, nombre, curso, horas, tipo, fecha y marca de demostración.
**No devuelve DNI (ni siquiera enmascarado), nota, motivo, archivos ni IDs internos.**
La página pública acepta el código escrito o la URL del QR, y distingue válido,
anulado y reemplazado con el enlace al nuevo código.

`GET /api/certificados/:codigo/documento` y `/archivo` requieren sesión del titular
o de un administrador de su organización. La primera permite la vista privada
con DNI enmascarado; la segunda descarga el PDF. Un anulado o reemplazado no se
puede volver a descargar como válido. La descarga del historial aplica el mismo
control de estado. Los certificados válidos del historial cuentan cada curso una
sola vez en las horas que ya muestra el frontend.

Anular exige motivo y conserva el registro. Corregir exige nombre y motivo,
crea otro código/PDF, deja el anterior como reemplazado y guarda la relación.
No cambia el perfil del usuario. Una operación concurrente sobre el mismo curso
se serializa; no hay dos certificados actuales para la misma inscripción.

## API administrativa

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/cursos/:id/cierre` | Asistencia y previsualización del cierre |
| POST | `/api/cursos/:id/cerrar` | `{ excepciones: [{ agremiadoId, motivo }] }` |
| GET | `/api/cursos/:id/certificados` | Resultados, códigos y estados |
| POST | `/api/cursos/:id/excepciones` | Excepción posterior: `{ agremiadoId, motivo }` |
| POST | `/api/certificados/:codigo/anular` | `{ motivo }` |
| POST | `/api/certificados/:codigo/corregir` | `{ nombre, motivo }` |

La matriz de permisos exige administrador y cada operación comprueba además la
organización. `auditoriaCertificados` registra actor, fecha del servidor, curso,
código, acción y motivo cuando corresponde. Los motivos no se publican.

## Migración y compatibilidad

`0013-certificadosQr.sql` añade el cierre del curso, estados de certificados,
fotografía de datos, relación de reemplazo, índice único parcial y auditoría.
No modifica migraciones aplicadas. Los PDF históricos se conservan; no se
reconstruyen ni se inventan fechas faltantes. Un registro antiguo sin fotografía
usa la información disponible al consultarlo, señalando las fechas no registradas.

Las dependencias PDF/QR son `pdf-lib`, `@pdf-lib/fontkit` y `qrcode`, todas locales:
no se envían nombres ni DNI a un generador externo. Referencias de API:
[PDF-LIB](https://pdf-lib.js.org/docs/api/classes/pdfdocument) y
[node-qrcode](https://github.com/soldair/node-qrcode).
Se actualizaron versiones mínimas compatibles de herramientas/dependencias con
avisos de seguridad, conservando las versiones de publicación de los paquetes.
El repositorio mantiene su política existente de instalación sin lockfile en CI;
esta tarea no cambia los workflows ni declara reproducibilidad por un lockfile.

## Fuera de este sprint

- Sprint 3: pago confirmado, avisos por correo/plataforma, tiempo de conexión,
  híbrido y recuperaciones.
- Sprint 4: aprobación/exámenes, grabados y cursos encadenados.
- Sprint 5: programas y certificación acumulativa.

La API no concede constancias equivalentes para modalidades o reglas aún no
implementadas. No se simulan pagos confirmados ni correos enviados.

## Verificación y entrega

Se comprueban 80/70 %, rechazo de motivos vacíos, cierre repetido, archivo estable,
privacidad pública y privada, anulación/reemplazo, excepciones auditadas y límites
de modalidad, evaluación y fecha. El recorrido real prueba el cierre y la descarga
desde navegador a 360 px, y la verificación sin iniciar sesión.

Se renderizó un PDF de prueba, se extrajo su texto y se decodificó su QR desde la
imagen del propio PDF; apuntó al código esperado en el frontend configurado.
La fixture `certificadoDemoE2e.ts` rechaza cualquier base distinta de la exclusiva
de E2E y no introduce endpoints de prueba en la aplicación.

Verificación local de esta entrega: tipos de backend, frontend y E2E correctos;
297 pruebas unitarias de backend, 55 de frontend y 3 del servidor frontend;
250 pruebas de integración en la suite completa y 7 pruebas específicas de
certificados tras añadir el caso de reversión por fallo de auditoría; 25 E2E
reales y 4 E2E demo de certificados aprobados. `npm audit` no reportó
vulnerabilidades. Estas comprobaciones no sustituyen el build ni la ejecución
de CI del entorno de entrega.

Pendientes del usuario: aplicar `npm run migrate` en el entorno de entrega,
ejecutar `npm run build` y realizar las operaciones Git/PR manuales. Las firmas
reales y la aprobación de la plantilla oficial quedan fuera de esta entrega demo.
