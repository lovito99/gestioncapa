import { Pool } from 'pg'
import { env } from '../config/env.js'

// Este comando solo prepara una base de pruebas; nunca borra datos.
if (env.NODE_ENV !== 'test' || env.DB_NAME !== 'gestioncapa_e2e') {
  throw new Error('E2E requiere NODE_ENV=test y DB_NAME=gestioncapa_e2e.')
}

const conexion = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: 'postgres',
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
})

try {
  const existe = await conexion.query('select 1 from pg_database where datname = $1', [env.DB_NAME])
  if (existe.rowCount === 0) {
    await conexion.query('create database gestioncapa_e2e')
  }
  console.log('Base gestioncapa_e2e lista. El backend creará las tablas y el administrador de pruebas.')
} finally {
  await conexion.end()
}
