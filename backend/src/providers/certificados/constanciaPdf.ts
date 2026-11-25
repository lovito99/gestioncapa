import { readFile } from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import type { DatosDocumento } from '../../entities/certificados/certificado.js';
import { etiquetasModalidadCurso, modalidadesCurso, type ModalidadCurso } from '../../entities/cursos/modalidad.js';

/** Documento de demostración: nunca imita una firma institucional autorizada. */
/** `origenPublico` es la dirección del frontend donde se verifica el código del QR. */
export async function crearConstancia(datos: DatosDocumento, codigo: string, emitidoEn: string, origenPublico: string) {
  const aprobacion = datos.tipo === 'APROBACION';
  const titulo = aprobacion ? 'CERTIFICADO DE APROBACIÓN' : 'CONSTANCIA DE PARTICIPACIÓN';
  const documento = await PDFDocument.create();
  documento.registerFontkit(fontkit);
  const pagina = documento.addPage([842, 595]);
  const fuente = await documento.embedFont(await readFile(new URL('../../../assets/fuenteRegular.ttf', import.meta.url)), { subset: true });
  const negrita = await documento.embedFont(await readFile(new URL('../../../assets/fuenteNegrita.ttf', import.meta.url)), { subset: true });
  const escribir = (texto: string, y: number, tamano = 12, ancho = 720) => {
    const seguro = texto.normalize('NFC').replace(/[\x00-\x1f\x7f]/g, ' ');
    const lineas: string[] = []; let linea = '';
    const fragmentos: string[] = [];
    for (const palabra of seguro.split(/\s+/)) {
      let fragmento = '';
      for (const letra of palabra) {
        if (fuente.widthOfTextAtSize(fragmento + letra, tamano) > ancho && fragmento) { fragmentos.push(fragmento); fragmento = letra; }
        else fragmento += letra;
      }
      fragmentos.push(fragmento);
    }
    for (const palabra of fragmentos) {
      const siguiente = linea ? `${linea} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(siguiente, tamano) > ancho && linea) { lineas.push(linea); linea = palabra; } else linea = siguiente;
    }
    lineas.push(linea);
    for (const [indice, valor] of lineas.entries()) pagina.drawText(valor, { x: 60, y: y-indice*(tamano+5), size: tamano, font: fuente, color: rgb(.16,.13,.13), maxWidth: ancho });
  };
  pagina.drawRectangle({ x: 25, y: 25, width: 792, height: 545, borderWidth: 2, borderColor: rgb(.48,.13,.2) });
  const logo = await documento.embedPng(await readFile(new URL('../../../assets/insignia-cppp.png', import.meta.url)));
  const dimensiones = logo.scaleToFit(65, 75);
  pagina.drawImage(logo, { x: 60, y: 474, ...dimensiones });
  pagina.drawText('Colegio Profesional de Profesores del Perú', { x:145, y:515, size:18, font:negrita });
  pagina.drawText('Región Cusco', { x:145, y:490, size:16, font:fuente });
  pagina.drawText(titulo, { x: 185, y: 445, size: 23, font: negrita, color: rgb(.48,.13,.2) });
  escribir('Se otorga a:', 400);
  escribir(datos.nombre, 371, Math.min(20, 1250 / fuente.widthOfTextAtSize(datos.nombre.normalize('NFC'), 1)));
  escribir(`DNI: ${datos.dniEnmascarado ?? 'No registrado'}`, 332);
  escribir(`Por ${aprobacion ? 'aprobar' : 'participar en'} el curso: ${datos.curso}`, 300, 14);
  const modalidad = modalidadesCurso.includes(datos.modalidad as ModalidadCurso)
    ? etiquetasModalidadCurso[datos.modalidad as ModalidadCurso]
    : 'No registrada';
  escribir(`Modalidad: ${modalidad} | ${datos.horasLectivas} horas lectivas`, 249);
  escribir(datos.fechaInicio && datos.fechaFin ? `Fechas: ${datos.fechaInicio} al ${datos.fechaFin}` : 'Fechas: no registradas en el documento original', 225);
  escribir(`Emisión: ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' }).format(new Date(emitidoEn))}`, 202);
  if (aprobacion && datos.nota !== undefined) {
    escribir(`Nota final: ${datos.nota.toLocaleString('es-PE', { maximumFractionDigits: 2 })}/20`, 178);
  }
  const enlace = `${origenPublico.replace(/\/$/, '')}/verificar/${encodeURIComponent(codigo)}`;
  const qr = await documento.embedPng(await QRCode.toDataURL(enlace, { errorCorrectionLevel: 'M', margin: 2, width: 256 }));
  pagina.drawImage(qr, { x: 665, y: 85, width: 105, height: 105 });
  escribir('Firma demo del Decano', 149);
  escribir(`Firma demo del instructor: ${datos.instructorNombre}`, 123, 11, 540);
  escribir(`Código: ${codigo}`, 79, 10);
  escribir('DEMO - SIN VALIDEZ OFICIAL | Firmas genéricas de demostración', 48, 11);
  documento.setTitle(`${aprobacion ? 'Certificado' : 'Constancia'} ${codigo}`);
  return Buffer.from(await documento.save());
}
