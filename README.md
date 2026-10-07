# GestionCapa

Proyecto en modo desarrollo/test con backend TypeScript en Node 24, frontend Vite/React en TypeScript, autenticacion JWT, Postgres y Redis levantados con Docker Compose.

## Entrar rápidamente y ejecutar E2E

Desde la raíz, `npm run dev:demo` abre la aplicación con datos demo en
`http://localhost:5173/login`, sin requerir Postgres ni Redis. Si aún no instalaste
las dependencias, ejecuta `npm install --include=dev --include=optional` primero.
Cuenta de coordinador: `ana.torres@organizacion.pe` / `demo123`.

- [Rutas, cuentas y acceso demo o real](docs/rutas.md).
- [Playwright, carpetas y comandos E2E](docs/e2e.md).
- [Especificaciones de entrada](docs/esp/entrada.md), [clases](docs/esp/clases.md),
  [asistencia](docs/esp/asist.md), [calidad y entorno](docs/esp/calidad.md)
  [acceso por rol y sesión](docs/esp/roles.md) y [autorización en el servidor](docs/esp/permisos.md),
  [programar clase](docs/esp/programar.md), [evitar solapamiento](docs/esp/solapamiento.md)
  e [inscribir participante](docs/esp/inscripcion.md).
- [Calidad antes de integrar](docs/calidad.md).

```bash
npm run e2e:inst
npm run e2e
npm run e2e:real # requiere Postgres y Redis; usa gestioncapa_e2e
```

## Requisitos

- Node.js 24.x
- npm 11.x
- Docker activo con Compose v2 (`docker compose version`)

## Estructura

```text
backend/
  server.js
  src/
    config/
    modules/
      auth/
      health/
    plugins/
    shared/
frontend/
  server.js
  public/
  src/
    auth/
    components/
    lib/
    mocks/
    paginas/
    servicios/
    types/
e2e/
  ayud/
  prb/
    demo/
    real/
docs/
  esp/
```

## Git y archivos ignorados

El proyecto tiene `.gitignore` en la raiz, en `backend/` y en `frontend/`.

No se suben al repositorio:

```text
node_modules/
dist/
.env
*.log
coverage/
.vite/
```

`node_modules/` puede aparecer en la raiz porque este proyecto usa npm workspaces. Es normal: npm instala dependencias compartidas arriba para `backend` y `frontend`.

`package-lock.json` si se conserva en Git. Ese archivo fija versiones exactas de dependencias para que desarrollo, test y servidor instalen lo mismo con `npm install`.

Los archivos `.env.example` si se suben porque son plantillas sin secretos reales. Los `.env` locales no se suben.

## Instalación local (integrante nuevo)

Requiere Node 24, npm 11 y Docker con Compose. Desde la raíz del repositorio:

```bash
git clone https://github.com/lovito99/gestioncapa.git
cd gestioncapa
npm install --include=dev --include=optional
docker compose up -d --wait     # PostgreSQL 17 y Redis 8, espera a que estén sanos
npm run env:init                # crea backend/.env con secretos aleatorios
cp frontend/.env.example frontend/.env
npm run migrate
npm run seed                    # administrador + un usuario por rol
npm run dev
```

- Frontend: `http://localhost:5173` · Backend: `http://localhost:8080` · Salud: `http://localhost:8080/api/health`
- `npm run env:init` muestra la clave del administrador generada. No sobrescribe un
  `backend/.env` existente.
- Para usar el backend real en la UI, pon `VITE_USE_MOCKS=false` en `frontend/.env`.

Usuarios que crea `npm run seed` (fuera de producción):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `ADMIN_EMAIL` de `backend/.env` | `ADMIN_PASSWORD` de `backend/.env` |
| Coordinador | `ana.torres@organizacion.pe` | `demo123` |
| Instructor | `carlos.mendoza@organizacion.pe` | `demo123` |
| Instructora | `lucia.paredes@organizacion.pe` | `demo123` |
| Participante | `maria.quispe@demo.pe` | `demo123` |
| Participante | `luz.apaza@demo.pe` | `demo123` |

Con `NODE_ENV=production` el seed solo crea el administrador. El seed es idempotente:
no duplica usuarios ni cambia la clave de los que ya existen.

### Variables de entorno

El backend valida `backend/.env` **antes** de abrir el puerto. Si falta una
variable requerida o conserva un marcador `CAMBIA_...` de `.env.example`, termina
con un mensaje como este:

```text
Configuración inválida: el servidor no arrancará hasta corregir estas variables de backend/.env:
  - JWT_SECRET: tiene el valor de ejemplo; reemplázalo por uno propio
  - ADMIN_PASSWORD: falta
Copia los nombres de backend/.env.example o genera un .env local con: npm run env:init
```

Requeridas: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_URL`,
`JWT_SECRET` (32+ caracteres), `ADMIN_EMAIL` y `ADMIN_PASSWORD` (12+ caracteres).
Si ya tenías un `backend/.env` antiguo, reemplaza `JWT_SECRET` y `ADMIN_PASSWORD`
(por ejemplo con `openssl rand -base64 32`) o bórralo y ejecuta `npm run env:init`.

Credenciales locales de los servicios (solo desarrollo/test, ya incluidas en
`docker-compose.yml` y `.env.example`): Postgres `gestiondecapacitacion` /
`gestiondecapacitacion` en `localhost:5432`, Redis con clave `gestiondecapacitacion`
en `localhost:6379`. Si esos puertos están ocupados: `POSTGRES_PORT=55432 REDIS_PORT=56379 docker compose up -d --wait`
y ajusta `DB_PORT` y `REDIS_URL`.

### Servicios Docker

```bash
docker compose ps                 # estado
docker compose stop               # detener sin borrar datos
docker compose up -d --wait       # volver a levantar
docker compose down               # borrar contenedores, conserva datos
docker compose down -v            # borrar contenedores y datos de desarrollo
docker exec -it gestioncapa-postgres psql -U gestiondecapacitacion -d gestiondecapacitacion
docker exec -it gestioncapa-redis redis-cli -a gestiondecapacitacion ping
```

Si antes creaste los contenedores con `docker run`, elimínalos una vez y pasa a
Compose; los datos se conservan porque usa los mismos volúmenes:

```bash
docker rm -f gestioncapa-postgres gestioncapa-redis
docker compose up -d --wait
```

### Calidad antes de un Pull Request

```bash
npm run verificar          # typecheck + build + pruebas unitarias
npm run test:integracion   # seed y login de cada rol (requiere docker compose)
```

GitHub Actions repite ambos en cada Pull Request, y la integración a `main` requiere
la aprobación de otro integrante. Detalles en [docs/calidad.md](docs/calidad.md).

## Flujo de la aplicacion

1. El usuario entra al login.
2. El backend valida correo y clave contra Postgres.
3. Si las credenciales son correctas, se emite un JWT.
4. El frontend guarda la sesion y lleva al usuario a su panel segun el rol:
   - Coordinador: gestion de clases, inscritos y asistencia.
   - Instructor: sus clases y el QR de asistencia.
   - Participante: sus clases y el escaner de QR para registrar asistencia (pensado para celular).
   - Administrador: estado del sistema (`/api/health`).

### Datos simulados (MSW)

Mientras el backend no tenga todos los endpoints, el frontend usa datos simulados con MSW (`VITE_USE_MOCKS=true` en `frontend/.env`). Usuarios de prueba en ese modo:

| Rol | Correo | Contrasena |
|---|---|---|
| Coordinadora | `ana.torres@organizacion.pe` | `demo123` |
| Instructor | `carlos.mendoza@organizacion.pe` | `demo123` |
| Participante (inscrita en 2 clases) | `maria.quispe@demo.pe` | `demo123` |
| Participante (inscrita en 1 clase) | `luz.apaza@demo.pe` | `demo123` |
| Administrador | `admin@gestioncapa.local` | `demo123` |

Prueba del flujo de asistencia (Sprint 1) en un mismo computador:

1. En una ventana normal entra como **instructor**, abre «Primeros auxilios básicos», pulsa **Mostrar QR** y luego **Copiar enlace del QR (solo desarrollo)**.
2. En una ventana de incógnito entra como **Luz** y pega el enlace en la barra de direcciones antes de que venza (30 s): aparece «¡Asistencia registrada!». Con una webcam también puedes usar **Registrar asistencia** y apuntar al QR.
3. En **la misma ventana de incógnito** cierra sesión, entra como **coordinadora** y abre la asistencia de la clase: Luz aparece como Presente con hora de Lima.

Los datos simulados viven en la memoria de cada ventana, por eso el paso 3 se hace en la ventana de Luz. La cámara del navegador solo funciona con `https` o en `localhost`; para probar desde un celular real hace falta `https` y el backend real.

Pruebas automáticas del flujo de asistencia (sobre la API simulada):

```bash
npm test -w frontend
```

Para usar el backend real, poner `VITE_USE_MOCKS=false`. En desarrollo Vite redirige `/api` a `VITE_BACKEND_URL` (por defecto `http://localhost:8080`). El contrato de datos que espera el frontend esta en `frontend/src/types/api.ts`.

## Scripts principales

```bash
npm run dev
npm run env:init
npm run migrate
npm run seed
npm run typecheck
npm run build
npm test
npm run verificar
npm run test:integracion
npm run start
```

Backend build/start:

```bash
npm run build -w backend
npm run start -w backend
```

Frontend build/start:

```bash
npm run build -w frontend
npm run start -w frontend
```

## Instalacion directa en Ubuntu 24.x

Instalar paquetes base:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt-get install -y build-essential git nginx
```

Instalar Node 24:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

Instalar Docker:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ${USER}
newgrp docker
```

Crear Postgres con contrasena de desarrollo/test:

```bash
docker volume create gestioncapa_postgres_data
docker run --name gestioncapa-postgres -e TZ="America/Lima" -e POSTGRES_DB=gestiondecapacitacion -e POSTGRES_USER=gestiondecapacitacion -e POSTGRES_PASSWORD=gestiondecapacitacion -p 5432:5432 -d --restart=always -v gestioncapa_postgres_data:/var/lib/postgresql/data postgres:17
```

Crear Redis con contrasena de desarrollo/test:

```bash
docker volume create gestioncapa_redis_data
docker run --name gestioncapa-redis -e TZ="America/Lima" -p 6379:6379 -d --restart=always -v gestioncapa_redis_data:/data redis:8 redis-server --appendonly yes --requirepass "gestiondecapacitacion"
```

Validar:

```bash
docker ps
docker exec -it gestioncapa-postgres psql -U gestiondecapacitacion -d gestiondecapacitacion -c "select 1;"
docker exec -it gestioncapa-redis redis-cli -a gestiondecapacitacion ping
```

Clonar y preparar la aplicacion:

```bash
git clone https://github.com/lovito99/gestioncapa.git
cd gestioncapa
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
nano backend/.env
nano frontend/.env
npm run migrate
npm run seed
npm run build
```

Levantar con PM2:

```bash
sudo npm install -g pm2
pm2 start backend/server.js --name gestioncapa-backend
pm2 start frontend/server.js --name gestioncapa-frontend
pm2 startup ubuntu
pm2 save
```

Nginx backend:

```nginx
server {
  server_name api.tudominio.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Nginx frontend:

```nginx
server {
  server_name app.tudominio.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
```

SSL:

```bash
sudo snap install --classic certbot
sudo certbot --nginx
```

## Arquitectura

### Backend

Lenguaje:

- TypeScript

Runtime y herramientas:

- Node.js 24.x
- npm workspaces
- tsx para desarrollo
- TypeScript compiler para build
- Scripts `npm run migrate` y `npm run seed` para preparar la base
- PM2 para ejecutar en servidor

Frameworks y librerias usadas:

- Fastify para API HTTP
- @fastify/cors para CORS
- @fastify/helmet para cabeceras de seguridad
- @fastify/sensible para errores HTTP
- @fastify/jwt para autenticacion JWT
- Zod para validar variables de entorno y datos
- pg para conexion con Postgres
- ioredis para conexion con Redis
- bcryptjs para hash de contrasenas
- dotenv para cargar `.env`

Estructura:

- `backend/src/config`: configuracion y variables de entorno
- `backend/src/modules`: modulos funcionales como auth y health
- `backend/src/plugins`: plugins de Fastify
- `backend/src/shared`: conexiones compartidas como Postgres y Redis

### Frontend

Lenguaje:

- TypeScript con TSX

Runtime y herramientas:

- Node.js 24.x
- Vite
- oxlint para revisar el codigo
- MSW para simular la API en desarrollo
- Express para servir el build en produccion

Frameworks y librerias usadas:

- React 19 y React Router
- TanStack Query para consultas al backend
- Axios para comunicacion con backend
- react-hook-form y Zod para formularios
- Tailwind CSS 4
- qrcode.react para dibujar el QR y qr-scanner para leerlo con la camara
- Vitest para pruebas automaticas
- lucide-react, sonner, date-fns

Flujo visual:

- Login
- Coordinador: clases, nueva/editar clase, detalle e inscritos, asistencia
- Instructor: mis clases, QR de asistencia
- Participante: mis clases, escanear QR, confirmacion de asistencia
- Administrador: estado del sistema

### Base de datos y cache

Base de datos:

- PostgreSQL 17
- Base: `gestiondecapacitacion`
- Usuario: `gestiondecapacitacion`
- Contrasena desarrollo/test: `gestiondecapacitacion`
- Zona horaria: `America/Lima`

Cache:

- Redis 8
- Contrasena desarrollo/test: `gestiondecapacitacion`
- Persistencia con `appendonly yes`
- Zona horaria: `America/Lima`

Infraestructura local/test:

- Docker Compose (`docker-compose.yml`)
- Volumen Postgres: `gestioncapa_postgres_data`
- Volumen Redis: `gestioncapa_redis_data`

En produccion se deben cambiar las credenciales de Postgres, Redis, JWT y administrador por valores privados y fuertes.
