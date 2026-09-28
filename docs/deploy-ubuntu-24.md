# Deploy Ubuntu 24.x

Guia base para desplegar GestionCapa en Ubuntu 24.x con Node 24.

## Dependencias del sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt-get install -y build-essential git nginx
```

## Node.js 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

## Aplicacion

```bash
git clone https://github.com/lovito99/gestioncapa.git
cd gestioncapa
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run build
```

## PM2

```bash
sudo npm install -g pm2
pm2 start backend/dist/server.js --name gestioncapa-backend
pm2 startup ubuntu
pm2 save
```

## Nginx backend

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

## SSL

```bash
sudo snap install --classic certbot
sudo certbot --nginx
```
