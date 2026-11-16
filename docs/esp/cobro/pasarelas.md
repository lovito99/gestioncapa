# Pasarelas y medios de cobro

La decisión comunicada para nuevos cobros es **Izipay**, con transferencia bancaria y
efectivo presencial como medios complementarios. Culqi se conserva para conciliación e
historial de obligaciones anteriores; no se habilita un comercio por esta documentación.

Izipay Web Core genera el token en backend y verifica HMAC-SHA256 sobre los bytes
originales de `payloadHttp`. Culqi Checkout Custom tokeniza la tarjeta y el backend crea
o consulta el cargo autenticado. GestionCapa no recibe PAN ni CVV y el navegador no
acredita un pago por sí solo.

Antes de llamar a una pasarela se registra obligación y operación. Hay una sola operación
activa por obligación, claves de idempotencia y auditoría; pagos tardíos se conservan
para conciliación pero no recuperan cupos vencidos. Las sesiones Izipay se cifran con
AES-256-GCM, AAD por operación y vencen a los 14 minutos. No se reintenta automáticamente
la creación de un cargo sin una referencia verificable.

Para transferencia, el propietario ve el destino e importe de su obligación, declara la
referencia y fecha de un abono completo, y adjunta el voucher exigido por HU-32. ADMIN
contrasta el extracto bancario y confirma o rechaza con motivo. Declarar una referencia
no confirma el pago. El destino ofrecido queda congelado por obligación, incluso si la
configuración posterior cambia.

El efectivo se registra exclusivamente por ADMIN con importe, fecha y recibo interno;
una referencia duplicada, una incidencia pendiente u otra operación activa bloquean una
nueva recepción. Las instrucciones de vouchers, SMTP y retención de tres meses están en
[pagosTransferenciaEfectivo.md](../pagosTransferenciaEfectivo.md).

Las variables de pasarela se mantienen deshabilitadas por defecto. Las credenciales se
configuran por el canal seguro de despliegue, nunca en código ni chat. Antes de activar,
el CPPP debe probar pago, rechazo, webhook/IPN HTTPS, reenvío de notificación y
conciliación con cuentas sandbox o de comercio reales.
