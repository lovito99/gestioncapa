const plantillas = {
  INSCRIPCION_CONFIRMADA: ['Inscripción confirmada', 'Consultar mi curso'],
  COMPROBANTE: ['Comprobante de pago', 'Consultar mi pago'],
  RECHAZO: ['Pago rechazado', 'Revisar mi pago'],
  CAMBIO_SESION: ['Cambio de sesión', 'Consultar mis sesiones'],
  CONSTANCIA_EMITIDA: ['Constancia disponible', 'Abrir mi historial'],
} as const;

export type TipoCorreo = keyof typeof plantillas;
export const tiposCorreo = Object.keys(plantillas) as TipoCorreo[];

export type DatosCorreo = {
  nombre: string;
  curso: string;
  cursoId: string;
  detalles: string[];
};

export function origenCorreoValido(valor: string, permitirLoopback = false) {
  if (/[\\\s]/.test(valor)) return false;
  const url = URL.parse(valor);
  if (!url || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return false;
  return url.protocol === 'https:' || (permitirLoopback && url.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
}

function escapar(texto: string) {
  const caracteres: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return texto.replace(/[&<>"']/g, caracter => caracteres[caracter]!);
}

export function contenidoCorreo(tipo: TipoCorreo, origen: string, datos: DatosCorreo, permitirLoopback = false) {
  if (!origenCorreoValido(origen, permitirLoopback) || !/^[1-9]\d{0,18}$/.test(datos.cursoId)) {
    throw new Error('Destino de correo inválido');
  }
  const [titulo, accion] = plantillas[tipo];
  const ruta = tipo === 'CONSTANCIA_EMITIDA' ? '/historial' : '/cursos/' + datos.cursoId;
  const enlace = new URL(ruta, origen).href;
  const saludo = 'Hola, ' + datos.nombre + '.';
  const lineas = [saludo, 'Curso: ' + datos.curso, ...datos.detalles];
  const texto = [...lineas, accion + ': ' + enlace, 'CPPP Región Cusco'].join('\n');
  const html = '<!doctype html><html lang="es"><meta charset="utf-8"><body style="background:#f5f4f0;margin:0;color:#24251e;font-family:Arial,sans-serif">'
    + '<table role="presentation" width="100%"><tr><td align="center">'
    + '<table role="presentation" width="100%" style="max-width:600px;background:white;text-align:left">'
    + '<tr><td style="padding:24px;background:#304426;color:white">Colegio Profesional de Profesores del Perú · Región Cusco</td></tr>'
    + '<tr><td style="padding:24px"><h1 style="font-size:24px">' + escapar(titulo) + '</h1>'
    + lineas.map(linea => '<p>' + escapar(linea) + '</p>').join('')
    + '<p><a style="background:#304426;color:white;padding:12px;display:inline-block" href="'
    + escapar(enlace) + '">' + escapar(accion) + '</a></p></td></tr></table></td></tr></table></body></html>';
  return { asunto: 'CPPP: ' + titulo, texto, html };
}
