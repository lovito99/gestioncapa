import { Pool } from 'pg'
import { env } from '../config/env.js'
import { sembrarUsuarios } from '../modules/auth/auth.service.js'
import { pool } from '../shared/database.js'
import { migrar } from '../shared/migraciones.js'

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
} finally {
  await conexion.end()
}

// Un usuario por rol (mismas cuentas que el modo demo) para las pruebas ROL-02.
try {
  await migrar(pool)
  await sembrarUsuarios()
  // Solo en gestioncapa_e2e (verificado arriba): cada ejecución empieza sin clases.
  await pool.query('truncate classes restart identity cascade')
  console.log('Base gestioncapa_e2e lista con un usuario por rol.')
} finally {
  await pool.end()
}
