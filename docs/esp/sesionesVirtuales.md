# HU-26: sesiones virtuales seguras

Criterios en [SPEC.md](../../SPEC.md) (sección HU-26); API en [API.md](../API.md);
operación de Jitsi en [reuniones.md](../reuniones.md); licencias en
[licenciasTerceros.md](../licenciasTerceros.md).

## Cómo funciona

| Necesidad | Mecanismo | Quién lo aplica |
|---|---|---|
| Solo entran inscritos con sesión | Credencial Jitsi de 5 min emitida por el backend tras comprobar inscripción, acceso al curso y retiro; Jitsi exige JWT (`ENABLE_GUESTS=0`, `JWT_ALLOW_EMPTY=0`) | Backend y Prosody |
| Sala de espera | Token del colegiado con `lobby: true` y `token_lobby_ondemand`; el moderador admite desde Personas | Prosody |
| Identidad confiable en la espera | `presence_identity` expone el `id` del JWT; el panel no confía en el nombre elegido | Prosody, mostrado por la sala |
| Políticas del instructor | Guardadas en `reuniones`; al conectar, la sala del moderador activa la moderación de micrófono, cámara o pantalla | Backend y sala del moderador |
| Nadie comparte pantalla sin permiso | Moderación `desktop` (botón deshabilitado) **y** vigilante: ante una pantalla no autorizada, el moderador la silencia, expulsa a la persona y revoca su acceso | Sala del moderador, Prosody y backend |
| Expulsión sin reingreso | Expulsión de todas las conexiones de la cuenta, `retirado` en backend (403 a credenciales nuevas) y reingreso con un token anterior retenido en la espera como «Expulsado» | Sala del moderador, Prosody y backend |
| Asistencia virtual | `event_sync` envía entradas y salidas de la sala principal con el `id` del JWT; al finalizar se une el tiempo de todas las conexiones y se compara con el mínimo | Prosody y backend |
| Aviso de grabación (Ley 29733) | Si `grabacionPrevista`, no hay credencial hasta aceptar el aviso; la aceptación queda con fecha. El servidor no graba | Backend y sala |

## Espiga técnica (T26-01), 16/11/2026, Jitsi local `stable-11248-2`

Clientes Chromium reales con lib-jitsi-meet, incluido un cliente manipulado que se salta la interfaz.

| Pregunta | Resultado |
|---|---|
| ¿Un colegiado entra antes que el moderador? | No: `membersOnly`; queda en la sala de espera |
| ¿La espera muestra la identidad real? | Sí: `identity.user.id` del JWT aunque el cliente cambie su nombre |
| ¿El colegiado puede admitirse, expulsar o moderar? | No: Prosody ignora esas órdenes de quien no modera |
| ¿La moderación `desktop` impide publicar a un cliente manipulado? | **No.** Con la moderación activa, `addTrack` de pantalla llegó al moderador (77 cuadros en 3 s). El silenciado del moderador lo detiene, pero el cliente puede reactivarlo |
| ¿Y con moderación de vídeo? | El puente bloquea todo vídeo del participante, incluso después de autorizarlo: no sirve para restringir solo la pantalla |
| ¿La expulsión impide volver? | La expulsión la aplica Prosody. Con un token aún vigente, la persona vuelve a la sala de espera; sin token nuevo no entra |
| ¿`event_sync` informa al backend? | Sí, con `id` del JWT y solo para la sala principal. Prosody no resuelve `/etc/hosts`: en local se usa la IP de la puerta de enlace de Docker |

Decisión: como Jitsi no impide en el servidor la pantalla de un cliente manipulado,
se aplica la alternativa aprobada (pregunta 7 del SPEC): vigilante en la sala del
moderador más expulsión aplicada por Prosody y revocación en el backend.

## Verificación real de punta a punta (16/11/2026)

Interfaz React, backend y Jitsi locales con una base aislada; script de Playwright
fuera del repositorio. Resultados:

- Enlace sin sesión → `/login`; conexión a Jitsi sin token → rechazada.
- Con grabación prevista, «Entrar» queda deshabilitado hasta aceptar el aviso.
- La colegiada queda en espera; el instructor ve «María Quispe · inscrito» y la admite.
- Mano oculta y «Compartir pantalla» deshabilitado según la configuración.
- Expulsión desde la interfaz: la colegiada ve «El instructor te retiró de la sesión.»; nueva credencial → 403.
- Cliente manipulado que publica pantalla: expulsado en **555 ms**, aviso al instructor y 403 al pedir otra credencial.
- Reingreso con el token anterior: aparece «Expulsado de esta sesión», sin botón Admitir, y no se une.
- Al finalizar: la colegiada que permaneció tuvo 89,76 % (cuenta, `attendances.origen='VIRTUAL'`); los expulsados no cuentan.

## Riesgos residuales y límites

- **Exposición del vigilante**: una pantalla no autorizada puede verse durante
  aproximadamente medio segundo antes de la expulsión. Si ningún moderador está
  conectado, el vigilante no actúa; por eso la sala de espera impide admitir a nadie sin moderador.
- **Mano levantada**: su restricción es solo de interfaz; un cliente manipulado
  puede publicarla, pero no obtiene permisos por ello.
- **Salidas tardías**: si alguien cierra el navegador, Prosody detecta la salida al
  expirar la conexión (hasta ~1 min). Finalizar cierra las conexiones abiertas con
  la hora de cierre, lo que puede sumar ese margen.
- **Token vigente tras expulsar**: hasta 5 min puede reconectarse, pero queda en la
  espera marcado como expulsado; el instructor no debe admitirlo.
- **Escala**: no se probó con ~1000 personas. La transmisión masiva (modo visitantes)
  y la sesión «ambas» de HU-36 quedan fuera de esta historia.
- **Producción**: falta el despliegue en el servidor del CPPP con HTTPS, TURN/UDP 10000
  y la dirección del backend visible desde Prosody (`--api=`).
