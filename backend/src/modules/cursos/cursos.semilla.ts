import type { PoolClient } from 'pg';

const cursosDemo = [
  { clave: 'seguridadPrimerosAuxilios', titulo: 'Demo · Seguridad y primeros auxilios', instructor: 'carlos.mendoza@organizacion.pe',
    descripcion: 'Curso publicado de ejemplo con certificado de aprobación, guía PDF, enlace y video de prueba.', horas: 24, modalidad: 'HIBRIDA', costo: 150, cupos: 30, certificado: 'APROBACION', nota: 14, estado: 'PUBLICADO',
    modulos: ['Prevención y seguridad', 'Práctica de primeros auxilios'], enlace: 'https://www.gob.pe/indeci' },
  { clave: 'didacticaEvaluacion', titulo: 'Demo · Didáctica y evaluación', instructor: 'lucia.paredes@organizacion.pe',
    descripcion: 'Curso gratuito publicado, con certificado de participación y módulos de ejemplo.', horas: 16, modalidad: 'PRESENCIAL', costo: 0, cupos: 50, certificado: 'PARTICIPACION', nota: 14, estado: 'PUBLICADO',
    modulos: ['Planificación didáctica', 'Evaluación del aprendizaje'], enlace: 'https://www.unesco.org/es/education' },
  { clave: 'herramientasDigitales', titulo: 'Demo · Herramientas digitales para docentes', instructor: 'carlos.mendoza@organizacion.pe',
    descripcion: 'Borrador de ejemplo: revisa los módulos y publícalo para verlo en el catálogo.', horas: 20, modalidad: 'VIRTUAL', costo: 120, cupos: 25, certificado: 'APROBACION', nota: 16, estado: 'BORRADOR',
    modulos: ['Recursos y herramientas digitales', 'Diseño de una actividad virtual'], enlace: 'https://www.unesco.org/es/digital-education' },
];

/** PDF pequeño y válido, sin dependencias ni descargas de servicios externos. */
export function pdfDemoCursos() {
  const texto = 'BT /F1 16 Tf 50 760 Td (GestionCapa - Guia de demostracion) Tj 0 -32 Td /F1 11 Tf (Material de ejemplo para explorar cursos, modulos y descargas.) Tj 0 -22 Td (No es una certificacion ni un material formativo oficial.) Tj ET';
  const objetos = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(texto)} >>\nstream\n${texto}\nendstream`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [indice, objeto] of objetos.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

/** Dentro de la transacción y del bloqueo del seed general. Nunca actualiza cursos existentes. */
export async function sembrarCursos(cliente: PoolClient, administradorEmail: string) {
  for (const datos of cursosDemo) {
    const existente = await cliente.query('select id from cursos where organization_id=1 and clave_demo=$1', [datos.clave]);
    if (existente.rowCount) continue;
    const personas = await cliente.query<{ id: string; email: string; role: string }>(`select id,email,role from users where email=any($1) and active and organization_id=1 for share`, [[administradorEmail.toLowerCase(), datos.instructor]]);
    const admin = personas.rows.find(p => p.email === administradorEmail.toLowerCase() && p.role === 'admin');
    const docente = personas.rows.find(p => p.email === datos.instructor && p.role === 'instructor');
    if (!admin || !docente) throw new Error('Los cursos demo necesitan un administrador e instructores activos en la organización 1.');
    const curso = (await cliente.query<{ id: string }>(`insert into cursos
      (organization_id,creador_id,instructor_id,clave_demo,titulo,descripcion,horas_lectivas,modalidad,costo,cupos,tipo_certificado,nota_minima,estado,publicado_en)
      values (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::varchar,case when $12::varchar='PUBLICADO' then now() end) returning id`,
    [admin.id, docente.id, datos.clave, datos.titulo, datos.descripcion, datos.horas, datos.modalidad, datos.costo, datos.cupos, datos.certificado, datos.nota, datos.estado])).rows[0]!;
    for (const [indice, titulo] of datos.modulos.entries()) {
      const modulo = (await cliente.query<{ id: string }>('insert into modulos_curso(curso_id,titulo,orden) values($1,$2,$3) returning id', [curso.id, titulo, indice + 1])).rows[0]!;
      if (indice === 0) {
        await cliente.query(`insert into materiales_curso(modulo_id,titulo,tipo,archivo) values($1,'Guía de demostración (PDF)','PDF',$2)`, [modulo.id, pdfDemoCursos()]);
        await cliente.query(`insert into materiales_curso(modulo_id,titulo,tipo,url) values($1,'Referencia externa de ejemplo','ENLACE',$2)`, [modulo.id, datos.enlace]);
      } else await cliente.query(`insert into materiales_curso(modulo_id,titulo,tipo,url) values($1,'Video de prueba · Big Buck Bunny','VIDEO','https://www.youtube.com/watch?v=aqz-KE-bpKQ')`, [modulo.id]);
    }
  }
  // Cuenta lo disponible, incluyendo modificaciones y eliminaciones hechas por el usuario.
  const totales = (await cliente.query<{ cursos: number; modulos: number; materiales: number }>(`select
    (select count(*)::int from cursos where organization_id=1 and clave_demo=any($1)) as cursos,
    (select count(*)::int from modulos_curso m join cursos c on c.id=m.curso_id where c.organization_id=1 and c.clave_demo=any($1)) as modulos,
    (select count(*)::int from materiales_curso a join modulos_curso m on m.id=a.modulo_id join cursos c on c.id=m.curso_id where c.organization_id=1 and c.clave_demo=any($1)) as materiales`, [cursosDemo.map(c => c.clave)])).rows[0]!;
  return totales;
}
