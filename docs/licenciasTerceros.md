# Software de terceros: videoconferencia (HU-26)

El aula virtual reutiliza proyectos de código libre de Jitsi. Este registro cumple el
pedido de HU-26 de documentar qué se reutiliza, con qué licencia y qué se modificó.
Revisado el 16/11/2026 contra la versión fijada en
[infraestructura/jitsi/version.json](../infraestructura/jitsi/version.json).

| Proyecto | Versión | Licencia | Origen | Cómo se usa | Modificaciones |
|---|---|---|---|---|---|
| docker-jitsi-meet (Prosody, Jicofo, JVB, web) | `stable-11248-2` | Apache-2.0 | [github.com/jitsi/docker-jitsi-meet](https://github.com/jitsi/docker-jitsi-meet) | Servidor propio con Docker; se descarga con `descargar.py` y checksum | Ninguna en el código. Solo variables de entorno y un archivo de configuración propio |
| lib-jitsi-meet | La servida por esa versión del servidor | Apache-2.0 | [github.com/jitsi/lib-jitsi-meet](https://github.com/jitsi/lib-jitsi-meet) | La sala la carga en tiempo de ejecución desde `/libs/lib-jitsi-meet.min.js` del propio servidor; no se incluye en el bundle | Ninguna. `frontend/src/servicios/compatibilidadJitsi.ts` es un adaptador propio |
| Plugins de Prosody de jitsi-meet (`token_affiliation`, `presence_identity`, `persistent_lobby`, `muc_lobby_rooms`, `av_moderation_component`) | Incluidos en la imagen | Apache-2.0 | [github.com/jitsi/jitsi-meet](https://github.com/jitsi/jitsi-meet) (`resources/prosody-plugins`) | Activados por configuración | Ninguna |
| jitsi-contrib/prosody-plugins (`event_sync`, `token_lobby_ondemand`) | Incluidos en `/prosody-plugins-contrib` de la imagen | Apache-2.0 (archivo `LICENSE` de la carpeta) | [github.com/jitsi-contrib/prosody-plugins](https://github.com/jitsi-contrib/prosody-plugins) | `event_sync` informa entradas y salidas al backend; `token_lobby_ondemand` envía a la sala de espera según el token | Ninguna |

## Avisos de licencia

- La distribución descargada conserva su `LICENSE` en `infraestructura/jitsi/servidor/LICENSE`.
  Esa carpeta no se versiona: `descargar.py` la reproduce con la versión y el checksum fijados.
- La biblioteca servida incluye su aviso en `/libs/lib-jitsi-meet.min.js.LICENSE.txt`.
- Si en el futuro se redistribuye una copia modificada de cualquiera de estos proyectos,
  Apache-2.0 exige conservar la licencia, los avisos de copyright y el archivo `NOTICE`
  si existe, y marcar los archivos cambiados.

## Prototipo «Aula virtual»

El prototipo (salas, personas, chat, compartir pantalla, levantar mano y comparación
de inscritos con conexiones) entró al repositorio en el commit `0f1aaef` del 28/10/2026.
Está construido sobre los proyectos anteriores sin modificarlos. HU-26 lo completa
con sala de espera, políticas guardadas, expulsión sin reingreso, vigilancia de
pantalla y asistencia virtual. Si existe otro prototipo fuera del repositorio, debe
registrarse aquí antes de integrarlo.

## Diagramas de arquitectura y flujos

Archify 3.2.0 se incluye como herramienta local de Codex en
`.agents/skills/archify`, desde la revisión
`44781293f38728baf04dbad33ce1a0cef8c39cca` de
[tt-a1i/archify](https://github.com/tt-a1i/archify). Se utiliza para generar los
[diagramas HTML](flujos.md); no forma parte de las dependencias de la aplicación.
La copia conserva sin cambios su [licencia Apache-2.0](../.agents/skills/archify/LICENSE),
[NOTICE](../.agents/skills/archify/NOTICE),
[licencia MIT complementaria](../.agents/skills/archify/LICENSE-MIT) y
[avisos de terceros](../.agents/skills/archify/THIRD_PARTY_NOTICES.md), incluidos
los nombres originales exigidos por el paquete.
