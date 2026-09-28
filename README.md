# GestionCapa

Proyecto en modo desarrollo/test con backend TypeScript en Node 24, frontend Vite/React en JavaScript, autenticacion JWT, Postgres y Redis levantados con Docker directo.

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
  src/
    services/
    styles/
```

## Credenciales recordadas para desarrollo/test

Estas credenciales son solo para entorno local de desarrollo/test. No usarlas en produccion.

Postgres:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestioncapa
DB_USER=gestioncapa
DB_PASSWORD=gestioncapa_dev_password
```

Redis:

```env
REDIS_URL=redis://:gestioncapa_redis_password@localhost:6379
REDIS_PASSWORD=gestioncapa_redis_password
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

3. Crear Postgres directo con Docker:

```bash
docker volume create gestioncapa_postgres_data
docker run --name gestioncapa-postgres \
  -e TZ="America/Lima" \
  -e POSTGRES_DB=gestioncapa \
  -e POSTGRES_USER=gestioncapa \
  -e POSTGRES_PASSWORD=gestioncapa_dev_password \
  -p 5432:5432 \
  -d --restart=always \
  -v gestioncapa_postgres_data:/var/lib/postgresql/data \
  postgres:17
```

4. Crear Redis directo con Docker:

```bash
docker volume create gestioncapa_redis_data
docker run --name gestioncapa-redis \
  -e TZ="America/Lima" \
  -p 6379:6379 \
  -d --restart=always \
  -v gestioncapa_redis_data:/data \
  redis:8 redis-server --appendonly yes --requirepass "gestioncapa_redis_password"
```

5. Validar Postgres y Redis:

```bash
docker ps
docker exec -it gestioncapa-postgres psql -U gestioncapa -d gestioncapa -c "select 1;"
docker exec -it gestioncapa-redis redis-cli -a gestioncapa_redis_password ping
```

Redis debe responder:

```text
PONG
```

6. Iniciar backend y frontend:

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

1. El usuario llega a la landing page.
2. Desde la landing entra al login.
3. El backend valida correo y clave contra Postgres.
4. Si las credenciales son correctas, se emite un JWT.
5. El frontend guarda el token y muestra el panel autenticado.

## Scripts principales

```bash
npm run dev
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
docker run --name gestioncapa-postgres \
  -e TZ="America/Lima" \
  -e POSTGRES_DB=gestioncapa \
  -e POSTGRES_USER=gestioncapa \
  -e POSTGRES_PASSWORD=gestioncapa_dev_password \
  -p 5432:5432 \
  -d --restart=always \
  -v gestioncapa_postgres_data:/var/lib/postgresql/data \
  postgres:17
```

Crear Redis con contrasena de desarrollo/test:

```bash
docker volume create gestioncapa_redis_data
docker run --name gestioncapa-redis \
  -e TZ="America/Lima" \
  -p 6379:6379 \
  -d --restart=always \
  -v gestioncapa_redis_data:/data \
  redis:8 redis-server --appendonly yes --requirepass "gestioncapa_redis_password"
```

Validar:

```bash
docker ps
docker exec -it gestioncapa-postgres psql -U gestioncapa -d gestioncapa -c "select 1;"
docker exec -it gestioncapa-redis redis-cli -a gestioncapa_redis_password ping
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
