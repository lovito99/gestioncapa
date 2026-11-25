import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { setTimeout as esperar } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { crearObligacion, obtenerPago } from '../../src/repositories/pagos/pagosRepository.js';
import * as transferencias from '../../src/routes/pagos.routes.js';
import { obtenerVoucher, eliminarVouchersVencidos } from '../../src/repositories/pagos/vouchersRepository.js';
import { validarArchivoVoucher } from '../../src/services/pagos/voucherArchivo.js';
import { crearPdfTexto } from '../../src/shared/pdf.js';
import { iniciarProcesosCobro } from '../../src/jobs/procesosCobro.js';

let cursoId:string;let admin:number;let alumno:number;
const app=Fastify({logger:false});
const voucher={tipo:'application/pdf',contenidoBase64:crearPdfTexto('Voucher HU32',['Solo pruebas.']).toString('base64')};
before(async()=>{
  await migrar(pool);
  const personas=(await pool.query(`insert into users(name,email,password_hash,role) values('Admin',$1,'sin-acceso','admin'),('Alumno',$2,'sin-acceso','agremiado') returning id`,
    [`retencion-admin-${randomUUID()}@prueba.local`,`retencion-alumno-${randomUUID()}@prueba.local`])).rows;
  admin=Number(personas[0].id);alumno=Number(personas[1].id);
  cursoId=(await pool.query(`insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado)
    values($1,$1,'Retención HU32',24,'PRESENCIAL',150.50,5,'PARTICIPACION') returning id::text`,[admin])).rows[0].id;
});
after(async()=>{
  await app.close();
  if(cursoId) {
    for(const tabla of ['transferenciasPago','destinosTransferencia','incidenciasPago','auditoriaPagos','hechosPago','operacionesPago','obligacionesPago']) {
      const pagos='select id from "obligacionesPago" where "cursoId"=$1';
      const filtro=tabla==='transferenciasPago'?`"operacionId" in (select id from "operacionesPago" where "pagoId" in (${pagos}))`:tabla==='obligacionesPago'?'"cursoId"=$1':`"pagoId" in (${pagos})`;
      await pool.query(`delete from "${tabla}" where ${filtro}`,[cursoId]);
    }
    await pool.query('delete from cursos where id=$1',[cursoId]);await pool.query('delete from users where id=any($1::bigint[])',[[admin,alumno]]);
  }
  await pool.end();
});
async function preparar() {
  const pago=await crearObligacion(pool,{cursoId,usuarioId:alumno,intentoId:randomUUID(),concepto:'CURSO',importeCentimos:15050,moneda:'PEN'});
  const destino=await transferencias.ofrecerTransferencia(pago.id,{banco:'BCP',titular:'Entidad de prueba',cuenta:'1234567890123',cci:'00212345678901234567'});
  const entrada={destinoId:destino.id,referencia:`RET-${randomUUID()}`,fechaOperacion:'2026-01-01',clave:randomUUID()};
  const op=await transferencias.declararTransferencia(pago.id,alumno,entrada,validarArchivoVoucher(voucher));
  return {pago,op,entrada};
}
test('HU32-08: el proceso de servidor elimina contenido vencido y conserva hash y pago aprobado',async()=>{
  const {pago,op,entrada}=await preparar();
  await transferencias.revisarTransferencia(pago.id,op.id,admin,{decision:'CONFIRMAR',referencia:entrada.referencia,fechaOperacion:entrada.fechaOperacion,importeCentimos:15050,moneda:'PEN',verificado:true});
  const plazo=(await pool.query(`select abs(extract(epoch from(v."eliminarEn"-(t."revisadoEn"+interval '3 months'))))<5 as correcto
    from "vouchersPago" v join "transferenciasPago" t on t."operacionId"=v."operacionId" where v."operacionId"=$1`,[op.id])).rows[0];
  assert.equal(plazo.correcto,true);
  await pool.query(`update "vouchersPago" set "eliminarEn"=clock_timestamp()-interval '1 second' where "operacionId"=$1`,[op.id]);
  iniciarProcesosCobro(app);
  let archivo;
  for(let intento=0;intento<100;intento++) {
    archivo=(await pool.query('select contenido,hash,"eliminadoEn" from "vouchersPago" where "operacionId"=$1',[op.id])).rows[0];
    if(archivo.contenido===null) break;
    await esperar(20);
  }
  assert.equal(archivo.contenido,null);assert.ok(archivo.hash);assert.ok(archivo.eliminadoEn);
  assert.equal((await obtenerPago(pago.id))?.estado,'PAGADO');
  await assert.rejects(obtenerVoucher(pago.id,op.id),{statusCode:410});
});
test('HU32-08: archivo pendiente vencido se repone en el mismo trámite sin reutilizar número ni borrar historial',async()=>{
  const {pago,op,entrada}=await preparar();
  await pool.query(`update "vouchersPago" set "eliminarEn"=clock_timestamp()-interval '1 second' where "operacionId"=$1`,[op.id]);
  await eliminarVouchersVencidos();
  await assert.rejects(transferencias.revisarTransferencia(pago.id,op.id,admin,{decision:'CONFIRMAR',referencia:entrada.referencia,fechaOperacion:entrada.fechaOperacion,importeCentimos:15050,moneda:'PEN',verificado:true}),{code:'VOUCHER_VENCIDO'});
  const reposicion={clave:randomUUID(),version:1,voucher};
  await assert.rejects(transferencias.reponerVoucher(pago.id,op.id,admin,reposicion),{statusCode:403});
  const id=await transferencias.reponerVoucher(pago.id,op.id,alumno,reposicion);
  assert.equal(await transferencias.reponerVoucher(pago.id,op.id,alumno,reposicion),id);
  assert.equal((await pool.query('select 1 from "vouchersPago" where "operacionId"=$1',[op.id])).rowCount,2);
  await transferencias.revisarTransferencia(pago.id,op.id,admin,{decision:'CONFIRMAR',referencia:entrada.referencia,fechaOperacion:entrada.fechaOperacion,importeCentimos:15050,moneda:'PEN',verificado:true});
  assert.equal((await obtenerPago(pago.id))?.estado,'PAGADO');
});
