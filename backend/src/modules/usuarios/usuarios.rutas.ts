import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../../shared/database.js';

const rol = z.enum(['admin','instructor','agremiado']);
const campos = { nombre: z.string().trim().min(1).max(120), email: z.email().trim().toLowerCase().max(180), rol,
  activo: z.boolean(), motivo: z.string().trim().min(1).max(1000) };
const clave = z.string().min(8).refine(v => Buffer.byteLength(v,'utf8') <= 72, 'La contraseña supera los 72 bytes permitidos.');
const alta = z.object({ ...campos, password: clave }).strict();
const edicion = z.object(campos).strict();
const columnas = 'id::text,name as nombre,email,role as rol,active as activo';

export async function registrarUsuarios(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => { reply.header('Cache-Control','private, no-store'); });
  app.get('/api/usuarios', async request => {
    const consulta = z.object({ pagina: z.coerce.number().int().min(1).default(1), tamanoPagina: z.coerce.number().int().min(1).max(50).default(20), buscar: z.string().trim().max(180).default('') }).parse(request.query);
    const { buscar, pagina, tamanoPagina } = consulta;
    const filas = (await pool.query(`select ${columnas} from users where strpos(lower(name||' '||email),lower($1))>0 order by name,id limit $2 offset $3`, [buscar,tamanoPagina,(pagina-1)*tamanoPagina])).rows;
    const total = (await pool.query<{ total: number }>(`select count(*)::int as total from users where strpos(lower(name||' '||email),lower($1))>0`,[buscar])).rows[0]!.total;
    return { items: filas, total, pagina, tamanoPagina };
  });
  app.post('/api/usuarios', async (request, reply) => {
    const datos = alta.parse(request.body);
    const hash = await bcrypt.hash(datos.password,12);
    const cliente = await pool.connect();
    try {
      await cliente.query('begin');
      await cliente.query('select pg_advisory_xact_lock(351426)');
      const actor = (await cliente.query("select id from users where id=$1 and role='admin' and active for share",[request.usuario!.id])).rowCount;
      if (!actor) { await cliente.query('rollback'); return reply.code(403).send({ code:'SIN_PERMISO',message:'No tienes permiso para gestionar usuarios.' }); }
      const usuario = (await cliente.query(`insert into users(name,email,password_hash,role,active) values($1,$2,$3,$4,$5) returning ${columnas}`, [datos.nombre,datos.email,hash,datos.rol,datos.activo])).rows[0]!;
      await cliente.query(`insert into "auditoriaRoles"("usuarioId","actorId",nuevo,motivo) values($1,$2,$3,$4)`, [usuario.id,request.usuario!.id,datos.rol,datos.motivo]);
      await cliente.query('commit'); return reply.code(201).send(usuario);
    } catch (error) {
      await cliente.query('rollback');
      if ((error as { code?: string }).code==='23505') return reply.code(409).send({ code:'CORREO_REGISTRADO',message:'Este correo ya tiene una cuenta.' });
      throw error;
    } finally { cliente.release(); }
  });
  app.put('/api/usuarios/:id', async (request, reply) => {
    const id = z.object({ id: z.coerce.number().int().positive().safe() }).parse(request.params).id;
    const datos = edicion.parse(request.body);
    if (String(id)===String(request.usuario!.id) && (datos.rol!=='admin' || !datos.activo)) return reply.code(409).send({ code:'CUENTA_PROPIA',message:'No puedes desactivar tu propia cuenta ni retirar tu rol de administrador.' });
    const cliente = await pool.connect();
    try {
      await cliente.query('begin');
      await cliente.query('select pg_advisory_xact_lock(351426)');
      const actor = (await cliente.query("select id from users where id=$1 and role='admin' and active for share",[request.usuario!.id])).rowCount;
      if (!actor) { await cliente.query('rollback'); return reply.code(403).send({ code:'SIN_PERMISO',message:'No tienes permiso para gestionar usuarios.' }); }
      const persona = (await cliente.query<{ role: string; active: boolean }>('select role,active from users where id=$1 for update',[id])).rows[0];
      if (!persona) { await cliente.query('rollback'); return reply.code(404).send({ code:'USUARIO_NO_EXISTE',message:'El usuario no existe.' }); }
      const usuario = (await cliente.query(`update users set name=$2,email=$3,role=$4,active=$5,updated_at=now() where id=$1 returning ${columnas}`,[id,datos.nombre,datos.email,datos.rol,datos.activo])).rows[0];
      await cliente.query(`insert into "auditoriaRoles"("usuarioId","actorId",anterior,nuevo,motivo) values($1,$2,$3,$4,$5)`,[id,request.usuario!.id,`${persona.role}:${persona.active}`,`${datos.rol}:${datos.activo}`,datos.motivo]);
      await cliente.query('commit'); return usuario;
    } catch (error) {
      await cliente.query('rollback');
      if ((error as { code?: string }).code==='23505') return reply.code(409).send({ code:'CORREO_REGISTRADO',message:'Este correo ya tiene una cuenta.' });
      throw error;
    } finally { cliente.release(); }
  });
}
