# Plantillas de correo del CPPP (SCRUM-211, Figma S3 10.1–10.5)

HTML listo para enviar por SMTP: tablas, estilos en línea y ancho máximo de 600 px
(se adapta a 360 px en celular). El backend reemplaza cada `{{campo}}` antes de enviar
y **debe escapar** los valores que vienen de usuarios (nombre, motivo, detalle).

Campos comunes a todas: `{{nombre}}` (nombre de pila), `{{correoEnmascarado}}` («m•••@gmail.com»)
y `{{urlLogo}}` (URL pública de la insignia del CPPP, 32 × 44 px).

| Archivo | Cuándo se envía | Campos propios |
|---|---|---|
| `inscripcion-confirmada.html` | Inscripción gratuita o pago confirmado | `curso`, `inicio` («Sáb. 16 nov. 2026 · 9:00 a. m.»), `modalidad`, `codigoOrden`, `enlaceCurso` |
| `pago-aprobado.html` | El administrador confirma el pago (comprobante, HU-32) | `monto` («S/ 60.00»), `medio` («Transferencia BCP · Op. 00482917»), `fecha`, `codigoOrden`, `enlaceComprobante` |
| `pago-rechazado.html` | Se rechaza el voucher | `venceEn` («mar. 19 nov.»), `motivo`, `detalle`, `codigoOrden`, `enlacePago` |
| `cambio-sesion.html` | Se reprograma una sesión | `sesion` («sesión 3»), `antes`, `ahora`, `lugar`, `enlaceSesiones` |
| `constancia-emitida.html` | Se emite la constancia o certificado | `asistencia` («92 %»), `textoNota` (« y nota 17» o vacío), `curso`, `horas`, `codigoVerificacion`, `enlaceConstancia` |

Los enlaces deben ser seguros y de un solo propósito (el Figma usa `https://cppp.pe/s/…`).
No incluir DNI completo ni datos de pago sensibles. El correo no reemplaza a una factura.
