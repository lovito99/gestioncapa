# GestionCapa

Proyecto en modo desarrollo/test con backend TypeScript en Node 24, frontend Vite/React en TypeScript, autenticacion JWT, Postgres y Redis levantados con Docker directo.

## Requisitos

- Node.js 24.x
- npm 11.x
- Docker activo

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

## Credenciales recordadas para desarrollo/test

Estas credenciales son solo para entorno local de desarrollo/test. No usarlas en produccion.

Postgres:

```env
TZ=America/Lima
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestiondecapacitacion
DB_USER=gestiondecapacitacion
DB_PASSWORD=gestiondecapacitacion
DB_TIMEZONE=America/Lima
```

Redis:

```env
REDIS_URL=redis://:gestiondecapacitacion@localhost:6379
REDIS_PASSWORD=gestiondecapacitacion
TZ=America/Lima
```

Administrador inicial:

```env
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@gestioncapa.local
ADMIN_PASSWORD=CambiaEstaClave123!
```

JWT:

```env
JWT_SECRET=cambia_este_secreto_jwt_de_32_caracteres_minimo
JWT_EXPIRES_IN=1d
```

En produccion cambiaremos `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_URL`, `JWT_SECRET` y `ADMIN_PASSWORD` por valores privados y fuertes.

## Instalacion local completa

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

El backend queda con zona horaria `America/Lima` para Node y para la conexion a Postgres.

3. Crear Postgres directo con Docker:

```bash
docker volume create gestioncapa_postgres_data
docker run --name gestioncapa-postgres -e TZ="America/Lima" -e POSTGRES_DB=gestiondecapacitacion -e POSTGRES_USER=gestiondecapacitacion -e POSTGRES_PASSWORD=gestiondecapacitacion -p 5432:5432 -d --restart=always -v gestioncapa_postgres_data:/var/lib/postgresql/data postgres:17
```

4. Crear Redis directo con Docker:

```bash
docker volume create gestioncapa_redis_data
docker run --name gestioncapa-redis -e TZ="America/Lima" -p 6379:6379 -d --restart=always -v gestioncapa_redis_data:/data redis:8 redis-server --appendonly yes --requirepass "gestiondecapacitacion"
```

5. Validar Postgres y Redis:

```bash
docker ps
docker exec -it gestioncapa-postgres psql -U gestiondecapacitacion -d gestiondecapacitacion -c "select 1;"
docker exec -it gestioncapa-redis redis-cli -a gestiondecapacitacion ping
```

Redis debe responder:

```text
PONG
```

6. Crear tablas y datos iniciales:

```bash
npm run migrate
npm run seed
```

`npm run migrate` crea las tablas necesarias si faltan. `npm run seed` crea el usuario administrador inicial si no existe.

7. Iniciar backend y frontend:

```bash
npm run dev
```

Backend: `http://localhost:8080`

Frontend: `http://localhost:5173`

Health API: `http://localhost:8080/api/health`

## Si los contenedores ya existen

```bash
docker start gestioncapa-postgres
docker start gestioncapa-redis
```

Para reiniciar:

```bash
docker restart gestioncapa-postgres
docker restart gestioncapa-redis
```

Para borrar contenedores sin borrar datos:

```bash
docker rm -f gestioncapa-postgres
docker rm -f gestioncapa-redis
```

Para borrar contenedores y datos de desarrollo/test:

```bash
docker rm -f gestioncapa-postgres
docker rm -f gestioncapa-redis
docker volume rm gestioncapa_postgres_data
docker volume rm gestioncapa_redis_data
```

## Flujo de la aplicacion

1. El usuario entra al login.
2. El backend valida correo y clave contra Postgres.
3. Si las credenciales son correctas, se emite un JWT.
4. El frontend guarda la sesion y lleva al usuario a su panel segun el rol:
   - Coordinador: gestion de clases, inscritos y asistencia.
   - Instructor: sus clases y el QR de asistencia.

### Datos simulados (MSW)

Mientras el backend no tenga todos los endpoints, el frontend usa datos simulados con MSW (`VITE_USE_MOCKS=true` en `frontend/.env`). Usuarios de prueba en ese modo:

| Rol | Correo | Contrasena |
|---|---|---|
| Coordinadora | `ana.torres@organizacion.pe` | `demo123` |
| Instructor | `carlos.mendoza@organizacion.pe` | `demo123` |

Para usar el backend real, poner `VITE_USE_MOCKS=false`. En desarrollo Vite redirige `/api` a `VITE_BACKEND_URL` (por defecto `http://localhost:8080`). El contrato de datos que espera el frontend esta en `frontend/src/types/api.ts`.

## Scripts principales

```bash
npm run dev
npm run migrate
npm run seed
npm run typecheck
npm run build
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
- qrcode.react para el QR de asistencia
- lucide-react, sonner, date-fns

Flujo visual:

- Login
- Coordinador: clases, nueva/editar clase, detalle e inscritos, asistencia
- Instructor: mis clases, QR de asistencia

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

- Docker directo con `docker run`
- Volumen Postgres: `gestioncapa_postgres_data`
- Volumen Redis: `gestioncapa_redis_data`

En produccion se deben cambiar las credenciales de Postgres, Redis, JWT y administrador por valores privados y fuertes.
