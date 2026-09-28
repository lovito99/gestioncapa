# GestionCapa

Base de proyecto con:

- Backend en Node 24 + TypeScript.
- Frontend en Vite + React.
- Workspaces npm para manejar ambos paquetes desde la raiz.

## Requisitos

- Node.js 24.x
- npm 11.x

## Instalacion

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Desarrollo

```bash
npm run dev
```

Backend: `http://localhost:8080`

Frontend: `http://localhost:5173`

## Build

```bash
npm run build
```

## Estructura

```text
backend/
  src/
    config/
    modules/
    plugins/
    shared/
frontend/
  src/
    components/
    pages/
    services/
    styles/
docs/
```
