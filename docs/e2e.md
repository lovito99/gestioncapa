# Playwright, SDD y TDD

## Estructura

Las carpetas nuevas usan nombres cortos en español. Se conserva la estructura
actual de producción para evitar romper importaciones y rutas.

```text
playwright.config.ts          Configuración demo: escritorio y móvil (Chromium)
playwright.real.config.ts     Configuración con backend real
e2e/
  ayud/                      Ayudas: cuentas, rutas, formulario, sesión y QR
  prb/                       Pruebas
    demo/                    Entrada, rutas, clases y asistencia
    real/                    Entrada del administrador y contrato de API
  inf/                       Informes HTML generados, ignorados por Git
  res/                       Capturas, vídeos y trazas de fallos, ignorados
  tsconfig.json              Revisión de tipos de las pruebas y configuraciones
docs/
  esp/                       Especificaciones con criterios de aceptación
    entrada.md
    clases.md
    asist.md
  rutas.md                   Cómo entrar y mapa de todas las pantallas
  e2e.md                     Esta guía
```

## Instalación y comandos

Ejecuta desde la raíz con Node 24 y npm 11. En una instalación limpia usa
`npm ci --include=dev --include=optional`; en tu checkout existente puedes usar
`npm install --include=dev --include=optional`.

```bash
npm run e2e:inst
npm run e2e
```

No tienes que levantar Vite: `webServer` lo hace automáticamente en 4173. El modo
demo fuerza `/api` y MSW, aunque tu `.env` tenga otros valores. No reutiliza un
servidor ya abierto en ese puerto para evitar probar el modo equivocado.

| Comando | Uso |
|---|---|
| `npm run e2e` | Suite demo en escritorio y móvil |
| `npm run e2e -- --project=escritorio` | Solo escritorio |
| `npm run e2e -- --grep CLA-03` | Solo el criterio de conflicto horario |
| `npm run e2e -- e2e/prb/demo/entrada.spec.ts` | Solo entrada demo |
| `npm run e2e:ui` | Interfaz visual de Playwright |
| `npm run e2e:ver` | Navegador visible |
| `npm run e2e:inf` | Abrir informe demo |
| `npm run e2e:real` | Suite real con API, Postgres y Redis |
| `npm run e2e:inf:real` | Abrir informe real |
| `npm run e2e:tipos` | Revisar tipos de E2E |

Si Linux indica que faltan bibliotecas del navegador, instala las dependencias
del sistema con `npx playwright install --with-deps chromium`. La configuración
actual usa Chromium en ambos tamaños; no afirma cobertura de Firefox o WebKit.

## Perfil real

Requiere Postgres y Redis disponibles con la configuración local del backend. Si
los contenedores del proyecto ya existen, ejecuta:

```bash
docker start gestioncapa-postgres gestioncapa-redis
npm run e2e:real
```

El preparador crea `gestioncapa_e2e` si falta, usando el usuario de Postgres local
(necesita permiso para crear bases), crea las tablas, siembra un usuario por rol y
vacía las clases de esa base para que cada ejecución empiece igual. Nunca toca
otra base: se detiene si `DB_NAME` no es `gestioncapa_e2e`.
Los ajustes `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_SSL` y `REDIS_URL`
pueden venir del entorno o del `.env` del backend. El nombre de la base, los
puertos, el secreto JWT y las credenciales de la cuenta E2E se fijan en la
configuración real. Nunca se ejecuta este perfil contra la base de producción.

| Servicio de pruebas | Dirección |
|---|---|
| Frontend real | `http://127.0.0.1:4174` |
| API real | `http://127.0.0.1:8180/api` |
| Base de datos | `gestioncapa_e2e` |

La cuenta `admin@e2e.gestioncapa.local` / `ClaveLocalE2e123!` es pública y sirve
solo para pruebas. Playwright detiene los servidores al terminar; la base de
pruebas queda disponible para futuras ejecuciones.

## Ciclo SDD + TDD

1. Escribe o modifica el criterio en `docs/esp/` antes de cambiar producción.
   Expresa la acción y su resultado visible, con un ID como `CLA-03`.
2. Añade una prueba en `e2e/prb/` con ese ID en el título. Usa los textos visibles,
   etiquetas y roles accesibles, sin seleccionar clases CSS del diseño.
3. Ejecuta esa prueba y confirma un fallo por el comportamiento esperado (rojo),
   no por un servidor caído o un selector incorrecto.
4. Implementa el cambio mínimo que cumpla el criterio y vuelve a probar (verde).
5. Refactoriza conservando el resultado, y ejecuta las suites afectadas antes de
   entregar el cambio.

Los flujos ya implementados tienen pruebas de regresión. No se describe como
TDD retroactivo el hecho de añadir pruebas a código existente.

### Ciclo aplicado al acceso real (6 de octubre de 2026)

Primero se escribieron los criterios REA y sus pruebas. La ejecución anterior a
la corrección produjo **1 prueba correcta y 4 fallidas**: `/health` funcionaba;
faltaba `usuario`, el navegador no completaba el acceso, el error de credenciales
carecía de `code` y `/auth/logout` respondía 404. Después se corrigió el contrato
de autenticación, conservando `user` por compatibilidad. La ejecución posterior
pasó los cinco criterios. El logout sigue siendo stateless, sin revocación de JWT.

El criterio RUT-03 también falló en escritorio y móvil: el login llevaba al inicio
del participante y perdía el enlace QR. Se corrigió la doble redirección usando
una sola navegación declarativa que conserva el destino y la query.

## Aislamiento y límites

Cada prueba crea un contexto independiente y entra mediante el formulario. Las
mutaciones demo se mantienen dentro de una navegación SPA; recargar restaura los
datos iniciales de MSW. Las pruebas de QR controlan el reloj y usan tokens emitidos
por el handler existente. No tienen esperas fijas con `waitForTimeout`. La fixture
`e2e/ayud/prueba.ts` bloquea Google Fonts y permite usar las fuentes del sistema;
las respuestas de la API no se sustituyen desde Playwright.

La suite demo comprueba UI y comportamiento simulado de clases y asistencia. La
suite real comprueba la integración de autenticación, salud y sesión. Todavía no
hay E2E real de clases ni de asistencia: faltan esos endpoints en el backend.
Tampoco se valida la lectura física de una cámara con estos recorridos.

En GitHub Actions, `.github/workflows/e2e.yml` instala dependencias y Chromium,
levanta servicios desechables y ejecuta las comprobaciones. Los informes y las
trazas se guardan como artefactos del workflow; no se publican como un sitio.

Referencias: [inicio de Playwright](https://playwright.dev/docs/intro),
[servidores de pruebas](https://playwright.dev/docs/test-webserver),
[buenas prácticas](https://playwright.dev/docs/best-practices) y
[integración continua](https://playwright.dev/docs/ci-intro).
