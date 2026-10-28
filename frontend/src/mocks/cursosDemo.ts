import type { DetalleCurso } from '@/servicios/cursos'

function pdfDemo() {
  const contenido = 'BT /F1 16 Tf 50 760 Td (GestionCapa - Guia de demostracion) Tj 0 -32 Td /F1 11 Tf (Material de ejemplo para explorar cursos, modulos y descargas.) Tj 0 -22 Td (No es una certificacion ni un material formativo oficial.) Tj ET'
  const objetos = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objetos.forEach((objeto, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}

export function crearCursosDemo() {
  let secuencia = 1
  const nuevoId = () => String(secuencia++)
  const archivos = new Map<string, Uint8Array>()
  const cursos: DetalleCurso[] = [
    { titulo: 'Demo · Seguridad y primeros auxilios', descripcion: 'Curso publicado con certificado de aprobación, PDF, enlace y video de prueba.', instructorId: 'i-1', instructorNombre: 'Carlos Mendoza Ríos', horasLectivas: 24, modalidad: 'HIBRIDA', costo: 150, cupos: 30, tipoCertificado: 'APROBACION', notaMinima: 14, estado: 'PUBLICADO',
      titulos: ['Prevención y seguridad', 'Práctica de primeros auxilios'], enlace: 'https://www.gob.pe/indeci' },
    { titulo: 'Demo · Didáctica y evaluación', descripcion: 'Curso gratuito publicado, con certificado de participación y módulos de ejemplo.', instructorId: 'i-2', instructorNombre: 'Lucía Paredes Quispe', horasLectivas: 16, modalidad: 'PRESENCIAL', costo: 0, cupos: 50, tipoCertificado: 'PARTICIPACION', notaMinima: 14, estado: 'PUBLICADO',
      titulos: ['Planificación didáctica', 'Evaluación del aprendizaje'], enlace: 'https://www.unesco.org/es/education' },
    { titulo: 'Demo · Herramientas digitales para docentes', descripcion: 'Borrador de ejemplo: revisa los módulos y publícalo para verlo en el catálogo.', instructorId: 'i-1', instructorNombre: 'Carlos Mendoza Ríos', horasLectivas: 20, modalidad: 'VIRTUAL', costo: 120, cupos: 25, tipoCertificado: 'APROBACION', notaMinima: 16, estado: 'BORRADOR',
      titulos: ['Recursos y herramientas digitales', 'Diseño de una actividad virtual'], enlace: 'https://www.unesco.org/es/digital-education' },
  ].map(({ titulos, enlace, ...curso }) => ({ ...curso, id: nuevoId(), modulos: titulos.map((titulo, indice) => {
    const id = nuevoId()
    if (indice === 0) {
      const pdfId = nuevoId()
      archivos.set(pdfId, pdfDemo())
      return { id, titulo, orden: indice + 1, materiales: [
        { id: pdfId, titulo: 'Guía de demostración (PDF)', tipo: 'PDF' as const, url: null },
        { id: nuevoId(), titulo: 'Referencia externa de ejemplo', tipo: 'ENLACE' as const, url: enlace },
      ] }
    }
    return { id, titulo, orden: indice + 1, materiales: [{ id: nuevoId(), titulo: 'Video de prueba · Big Buck Bunny', tipo: 'VIDEO' as const, url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' }] }
  }) })) as DetalleCurso[]
  return { cursos, archivos, siguienteId: secuencia }
}
