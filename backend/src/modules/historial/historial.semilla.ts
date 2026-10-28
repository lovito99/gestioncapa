import type { PoolClient } from 'pg';
import { crearPdfTexto } from '../../shared/pdf.js';
import { ocultarDni } from './historial.modelo.js';

/** Complemento demo; se llama solo fuera de producción y dentro de la transacción del seed. */
export async function sembrarHistorial(cliente: PoolClient) {
  const usuarios = (await cliente.query<{ id: string; email: string; name: string; dni: string | null }>(`select id,email,name,dni from users where organization_id=1 and role='participante'
    and email in ('maria.quispe@demo.pe','luz.apaza@demo.pe') and active`)).rows;
  const maria = usuarios.find(u => u.email === 'maria.quispe@demo.pe')!;
  const luz = usuarios.find(u => u.email === 'luz.apaza@demo.pe')!;
  if (!maria || !luz) throw new Error('El historial demo necesita las cuentas demo de María y Luz.');
  // Son documentos ficticios exclusivamente para las cuentas de demostración.
  for (const [persona, dni] of [[maria, '00001234'], [luz, '00005678']] as const) {
    await cliente.query('update users set dni=$2 where id=$1 and dni is null', [persona.id, dni]);
  }
  const cursos = (await cliente.query<{ id: string; clave_demo: string; instructor_id: string; titulo: string }>(`select id,clave_demo,instructor_id,titulo from cursos where organization_id=1 and clave_demo in ('seguridadPrimerosAuxilios','didacticaEvaluacion')`)).rows;
  for (const curso of cursos) {
    const terminado = curso.clave_demo === 'seguridadPrimerosAuxilios';
    const personas = terminado ? [maria, luz] : [maria];
    for (const persona of personas) {
      const finalizado = terminado && persona.id === maria.id;
      await cliente.query(`insert into inscripciones_curso(curso_id,usuario_id,estado,inscrito_en,terminado_en)
        values($1,$2,$3,now()-interval '30 days',case when $4 then now()-interval '10 days' end) on conflict do nothing`,
      [curso.id, persona.id, finalizado ? 'TERMINADO' : 'EN_CURSO', finalizado]);
    }
    for (let indice = 0; indice < 2; indice++) {
      const clave = `${curso.clave_demo}${indice + 1}`;
      let sesion = (await cliente.query<{ id: string }>('select id from classes where organization_id=1 and clave_historial_demo=$1', [clave])).rows[0];
      if (!sesion) {
        const dias = terminado ? -15 + indice : indice === 0 ? -3 : 10;
        sesion = (await cliente.query<{ id: string }>(`insert into classes(nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,curso_id,clave_historial_demo)
          values($1,$2,(now() at time zone 'America/Lima')::date+$3::int,'08:00','09:00','Sala demo de capacitación',$4,$5) returning id`,
        [`Demo · Sesión ${indice + 1} de ${curso.titulo.replace('Demo · ', '')}`, curso.instructor_id, dias, curso.id, clave])).rows[0]!;
      }
      for (const persona of personas) {
        await cliente.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing', [sesion.id, persona.id]);
        const presente = terminado ? (persona.id === maria.id ? indice === 0 : indice === 1) : indice === 0;
        if (presente) await cliente.query(`insert into attendances(class_id,user_id,created_by,timestamp_lima)
          select id,$2,$2,fecha+hora_inicio+interval '2 minutes' from classes where id=$1 and estado='PROGRAMADA'
          on conflict do nothing`, [sesion.id, persona.id]);
      }
    }
    if (terminado) {
      const dni = (await cliente.query<{ dni: string | null }>('select dni from users where id=$1', [maria.id])).rows[0]!.dni;
      const archivo = crearPdfTexto('Certificado de demostración', ['DEMO - SIN VALIDEZ OFICIAL', `Colegiado: ${maria.name}`, `DNI: ${ocultarDni(dni) ?? 'No registrado'}`, `Curso: ${curso.titulo}`, 'Archivo de prueba para comprobar la descarga desde el historial.']);
      await cliente.query(`insert into certificados_curso(curso_id,usuario_id,codigo,tipo,emitido_en,archivo)
        select curso_id,usuario_id,'DEMO-HU18-MARIA-SEGURIDAD','APROBACION',now()-interval '9 days',$3
        from inscripciones_curso where curso_id=$1 and usuario_id=$2 and estado='TERMINADO' on conflict do nothing`, [curso.id, maria.id, archivo]);
    }
  }
  const clases = (await cliente.query<{ id: string }>('select id from classes where organization_id=1 and clave_historial_demo is not null')).rows.map(s => s.id);
  const totales = (await cliente.query<{ sesionesHistorial: number; inscripcionesHistorial: number; asistenciasHistorial: number; inscripcionesCurso: number; certificados: number }>(`select
    cardinality($1::bigint[]) as "sesionesHistorial",
    (select count(*)::int from enrollments where class_id=any($1::bigint[])) as "inscripcionesHistorial",
    (select count(*)::int from attendances where class_id=any($1::bigint[])) as "asistenciasHistorial",
    (select count(*)::int from inscripciones_curso where usuario_id=any($2::bigint[]) and curso_id in (select id from cursos where organization_id=1 and clave_demo is not null)) as "inscripcionesCurso",
    (select count(*)::int from certificados_curso where codigo='DEMO-HU18-MARIA-SEGURIDAD') as certificados`, [clases, usuarios.map(u => u.id)])).rows[0]!;
  return totales;
}
