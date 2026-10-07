# GestionCapa — Frontend

Interfaz web de GestionCapa, construida a partir del diseño de Figma (página «01 · Escritorio»).

## Cómo ejecutarlo

Requisitos: Node.js 24 y npm 11. Ejecuta los comandos desde la raíz del monorepo.

```bash
npm install --include=dev --include=optional
npm run dev:demo        # abre http://localhost:5173/login sin backend
```

Mientras el backend no esté listo, **MSW** responde las llamadas a la API con datos de prueba
(`VITE_USE_MOCKS=true`). Los datos viven en memoria y se reinician al recargar la página.

Las [rutas y el acceso real](../docs/rutas.md) y las
[pruebas E2E con Playwright](../docs/e2e.md) se documentan desde la raíz.

### Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Coordinadora | `ana.torres@organizacion.pe` | `demo123` |
| Instructor | `carlos.mendoza@organizacion.pe` | `demo123` |
| Participante (inscrita en 2 clases) | `maria.quispe@demo.pe` | `demo123` |
| Participante (inscrita en 1 clase) | `luz.apaza@demo.pe` | `demo123` |
| Administrador | `admin@gestioncapa.local` | `demo123` |

### Navegación por rol

El menú está disponible en escritorio y celular. El administrador puede gestionar
clases, creación, edición, cancelación, inscripciones, asistencia y QR desde
`/admin`. El coordinador gestiona clases e inscripciones; el instructor abre sus
clases y muestra el QR; el participante consulta sus clases y abre el escáner.
Todas las pantallas usan los servicios reales con `VITE_USE_MOCKS=false`.

### Cómo ver cada estado del diseño

| Pantalla del Figma | Cómo llegar |
|---|---|
| Login con error | Contraseña incorrecta |
| Nueva clase con errores en los campos | Guardar sin instructor ni fecha |
| Nueva clase con conflicto de horario | Carlos Mendoza Ríos, 12/10/2026, 10:30–11:30 |
| Confirmar cancelación | Ícono ⊗ en la lista de clases |
| Detalle: ya inscrito | Inscribir `maria.quispe@demo.pe` en «Seguridad y salud en el trabajo» |
| Detalle: no existe | Inscribir `luis.ramos@demo.pe` |
| Asistencia vacía | Asistencia de «Atención al cliente» |

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera `dist/` |
| `npm run lint` | Revisa el código con oxlint |
| `npm run start` | Sirve el build existente en el puerto 3000 y reenvía `/api` al backend |
| `npm run test:servidor` | Verifica el proxy de API y las rutas de React |

Los comandos de esta tabla se ejecutan dentro de `frontend/` o con `-w frontend`
desde la raíz. Para E2E, ejecuta `npm run e2e` desde la raíz.

## Tecnologías

React 19 + Vite + TypeScript · React Router · TanStack Query + axios · React Hook Form + Zod ·
Tailwind CSS 4 · qrcode.react · date-fns · sonner · lucide-react · MSW

## Estructura

```
src/
  auth/            Sesión (contexto), rutas protegidas por rol
  components/
    layout/        Encabezado, navegación por rol y logo
    ui/            Botón, campo, entrada, alerta, etiqueta, diálogo…
  lib/             Cliente de la API, formato de fechas, sesión
  mocks/           Backend simulado (MSW) y datos de prueba
  paginas/
    LoginPagina.tsx
    instructor/    Mis clases, QR de asistencia
    coordinador/   Clases, nueva/editar clase, detalle, asistencia
  servicios/       Llamadas a la API (hooks de TanStack Query)
  types/api.ts     Contrato de datos con el backend
```

## Contrato de la API (para coordinar con backend)

Los tipos están en [`src/types/api.ts`](src/types/api.ts) y las respuestas simuladas en
[`src/mocks/handlers.ts`](src/mocks/handlers.ts). Todos los endpoints van bajo `VITE_API_URL` (por defecto `/api`).

| Método | Ruta | Respuesta OK | Errores esperados |
|---|---|---|---|
| POST | `/auth/login` | `{ token, usuario }` | 401 `CREDENCIALES_INVALIDAS` |
| POST | `/auth/logout` | 204 | — |
| GET | `/instructores` | `InstructorResumen[]` | — |
| GET | `/clases` | `Clase[]` | 401 |
| GET | `/instructor/clases` | `Clase[]` del instructor en sesión | 401 |
| GET | `/clases/:id` | `Clase` | 404 `CLASE_NO_EXISTE` |
| POST | `/clases` | 201 `Clase` | 422 `VALIDACION` (con `fields`), 409 `CONFLICTO_HORARIO` |
| PUT | `/clases/:id` | `Clase` | 422, 409, 404 |
| POST | `/clases/:id/cancelar` | `Clase` | 404 |
| GET | `/clases/:id/inscritos` | `Participante[]` | 404 |
| POST | `/clases/:id/inscritos` `{ email }` | 201 `Participante` | 409 `YA_INSCRITO`, 404 `PARTICIPANTE_NO_EXISTE` |
| GET | `/clases/:id/asistencia` | `Asistencia` | 404 |
| GET | `/clases/:id/qr` | `{ token, expiraEn, servidorAhora, duracionSegundos }` | 404 |

**Formato único de error:**

```json
{ "code": "CONFLICTO_HORARIO", "message": "Texto para mostrar al usuario", "fields": { "fecha": "…" } }
```

**Convenciones:** fechas `YYYY-MM-DD` y horas `HH:mm` en hora de Lima; fecha-hora en ISO 8601;
nombres de campo en `camelCase`; autenticación con `Authorization: Bearer <token>`
(si el backend usa cookie httpOnly, solo hay que ajustar `src/lib/api.ts` y `src/lib/sesion.ts`).

**QR de asistencia:** el backend genera el token y su vencimiento. El frontend dibuja el QR,
calcula la cuenta regresiva con la hora del servidor y pide un QR nuevo cuando vence.
El QR apunta a `/asistencia/marcar?token=…`; esa pantalla (la que ve el participante al escanear)
todavía no está en el diseño.

## Conectar con el backend real

1. En `frontend/.env`, pon `VITE_USE_MOCKS=false`, `VITE_API_URL=/api` y `VITE_BACKEND_URL=http://localhost:8080`.
2. Inicia el backend. Vite en desarrollo y Express en el puerto 3000 reenvían `/api` al backend; el navegador usa el mismo origen de la página.
3. Para servir `dist/`, ejecuta `npm run start -w frontend` desde la raíz. Express carga `frontend/.env` al arrancar. Un cambio en `VITE_BACKEND_URL` requiere reiniciar este servidor; cambios en `VITE_API_URL` o `VITE_USE_MOCKS` requieren recompilar React manualmente.
4. Si algún endpoint cambia, actualiza `src/types/api.ts` y `src/servicios/`.
