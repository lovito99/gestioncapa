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

Los enlaces de la aplicación apuntan al curso o al historial propio por HTTPS.
El destino pide sesión y aplica sus permisos. El mensaje incluye texto y HTML
con la identidad institucional y excluye DNI completo, voucher, datos de
tarjeta y credenciales. El comprobante PDF conserva su función de registro de
recepción del pago.

## Operar el envío

- Aplicar las migraciones 0037 y 0038. Configurar el remitente y el servidor
  institucional desde `backend/.env`. `correoOrigenPublico` fija el origen
  HTTPS de la aplicación. Si se omite, se usa `FRONTEND_URL`. Fuera de
  producción se admite HTTP en loopback. SMTP sin TLS exige `NODE_ENV=test`
  y un servidor local.
- Mantener `correoHabilitado=false` hasta verificar build, migraciones, TLS,
  navegación del enlace, recepción en un buzón autorizado y estado de la cola.
  El ajuste pausa también los comprobantes de HU-32. La aplicación sigue
  registrando eventos durante la pausa. Revisar el lote previo al reanudar.
- Administrar desde **Correos**. Un rechazo temporal comprobado espera
  1, 5, 15 y 60 minutos entre intentos. Tras cinco intentos fallidos o un
  rechazo permanente, el aviso queda fallido. Si el destinatario cambió,
  se omite y no se envía a la dirección nueva. Aceptado por SMTP indica
  que el servidor de correo aceptó el mensaje.
- Para entrega incierta, buscar el identificador del aviso en el registro
  del proveedor, como `<pago-UUID@gestioncapa.invalid>` o
  `<curso-UUID@gestioncapa.invalid>`. Verificar aceptación antes de
  decidir un reenvío. Si se revierte la aplicación, pausar SMTP y revisar
  los avisos en proceso y los inciertos. Conservar ambos historiales.
- Antes de activar el entorno de entrega, confirmar la retención acordada
  con el CPPP, revisar las filas pendientes de HU-32 y probar aprobaciones
  y rechazos de Izipay en su entorno autorizado. La aplicación reconoce
  rechazos documentados solo cuando están firmados y coinciden con la
  operación local. Los casos sin confirmación siguen en conciliación.
  [Notificaciones de Izipay](https://developers.izipay.pe/web-core/notifications/) · [Códigos de respuesta](https://developers.izipay.pe/codes-of-response/)
