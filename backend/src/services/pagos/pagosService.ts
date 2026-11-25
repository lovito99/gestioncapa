import { createHash } from 'node:crypto';
import { entradaConciliacion, entradaIntento, entradaRecepcionEfectivo, entradaReposicionVoucher, entradaRevisionTransferencia, entradaSubidaVoucher,
  entradaTransferencia, idOperacion, rutaProveedor, type EntradaIntento } from '../../dto/pagos/pagoDto.js';
import { idCurso } from '../../dto/cursos/cursoDto.js';
import { lineasImporte, type ArchivoVoucher, type DeclaracionTransferencia, type DestinoTransferencia, type OperacionPago, type Pago, type RevisionTransferencia } from '../../entities/pagos/pago.js';
import type { AvisoCorreo } from '../../entities/notificaciones/correo.js';
import type { UsuarioAutenticado } from '../../plugins/autorizacion.js';
import type { AdjuntosCorreo } from '../../providers/notificaciones/smtpProvider.js';
import type * as Consultas from '../../repositories/pagos/consultasPagoRepository.js';
import type * as RepositorioPagos from '../../repositories/pagos/pagosRepository.js';
import type * as Transferencias from '../../repositories/pagos/transferenciasRepository.js';
import type * as Vouchers from '../../repositories/pagos/vouchersRepository.js';
import { ErrorPago } from '../../shared/errorPago.js';
import { crearPdfTexto } from '../../shared/pdf.js';
import type { CotizacionPago } from './cotizacionPago.js';
import type { PasarelasService } from './pasarelasService.js';
import { validarArchivoVoucher } from './voucherArchivo.js';

type Actor = Pick<UsuarioAutenticado, 'id' | 'role'>;

export type ConfiguracionPagos = {
  pagosEntorno: 'sandbox' | 'produccion'; DB_NAME: string; voucherRetencionMeses: number; transferenciaHabilitada: boolean;
  transferenciaBanco?: string | undefined; transferenciaTitular?: string | undefined; transferenciaCuenta?: string | undefined; transferenciaCci?: string | undefined;
};

export type PagosServiceDeps = {
  configuracion: ConfiguracionPagos;
  pasarelas: PasarelasService;
  cotizacion: CotizacionPago;
  pagos: typeof RepositorioPagos;
  consultas: typeof Consultas;
  transferencias: typeof Transferencias;
  vouchers: typeof Vouchers;
  procesarColaCorreo: (origen: 'pagos', adjuntos: (aviso: AvisoCorreo) => AdjuntosCorreo) => Promise<number>;
};

export function crearPagosService(deps: PagosServiceDeps) {
  const env = deps.configuracion;
  const { pasarelas, conciliarOperacion } = deps.pasarelas;
  const { cotizarOpcion, aceptarCotizacion } = deps.cotizacion;
  const { consultas } = deps;
  const { obtenerPago, iniciarOperacion, cambiarEstadoOperacion, buscarOperacion, registrarEfectivo } = deps.pagos;

  function mediosDisponibles() {
    return { izipay: pasarelas.porMedio('IZIPAY')?.altas() ?? false, culqi: false,
      efectivo: true, transferencia: env.transferenciaHabilitada, entorno: env.pagosEntorno };
  }

  function opcionesEnLinea(pago: Pago) {
    return pasarelas.altas().flatMap(pasarela => pasarela.opciones?.(pago) ?? [])
      .map(opcion => cotizarOpcion(pago, opcion));
  }

  function respuestaSesion(operacion: OperacionPago, datos: unknown) {
    return datos ? {
      sesion: { medio: operacion.medio, datos },
      ...(operacion.medio === 'IZIPAY' && { izipay: datos }),
    } : {};
  }

  async function recuperarPagoEnLinea(operacion: OperacionPago) {
    const pasarela = pasarelas.porMedio(operacion.medio);
    const datos = pasarela?.altas() ? await pasarela.recuperar?.(operacion.id) : undefined;
    return { operacionId: operacion.id, estado: operacion.estado, ...respuestaSesion(operacion, datos) };
  }

  async function iniciarPago(pago: Pago, usuarioId: number, entrada: EntradaIntento) {
    const pasarela = pasarelas.porMedio(entrada.medio);
    if (!pasarela?.altas() || !pasarela.abrir) {
      const mensaje = entrada.medio === 'CULQI'
        ? 'Culqi se conserva para la conciliación de pagos anteriores.'
        : 'Esta pasarela todavía no está disponible.';
      throw new ErrorPago(503, entrada.medio === 'CULQI' ? 'PASARELA_NO_SELECCIONADA' : 'PASARELA_NO_CONFIGURADA', mensaje);
    }
    if (entrada.token) throw new ErrorPago(422, 'TOKEN_NO_ADMITIDO', 'Completa el pago en el formulario de la pasarela.');
    if (!(await consultas.intentoExiste(pago.intentoId))) {
      throw new ErrorPago(409, 'CONDICIONES_PENDIENTES', 'Las condiciones de esta inscripción requieren revisión administrativa.');
    }
    const carga = entrada.instrumento || entrada.cotizacion
      ? { medio: entrada.medio, instrumento: entrada.instrumento, cotizacion: entrada.cotizacion }
      : { medio: entrada.medio, token: null };
    const operacion = await iniciarOperacion(pago.id, usuarioId, {
      medio: entrada.medio, clave: entrada.clave, entorno: env.pagosEntorno,
      cargaHash: createHash('sha256').update(JSON.stringify(carga)).digest('hex'),
      cotizar: vigente => aceptarCotizacion(vigente, entrada, pasarela.opciones?.(vigente) ?? []),
    });
    if (!operacion.nueva) return { ...await recuperarPagoEnLinea(operacion), repetida: true };
    try {
      const datos = await pasarela.abrir(operacion, pago);
      return { operacionId: operacion.id, estado: operacion.estado, ...respuestaSesion(operacion, datos) };
    } catch (error) {
      await cambiarEstadoOperacion(operacion.id, 'INCIERTO');
      throw error;
    }
  }

  /** Proceso periódico: concilia hasta tres operaciones abiertas y limpia sesiones vencidas. */
  async function recuperarOperaciones() {
    await consultas.limpiarSesionesVencidas();
    const adaptadores = pasarelas.conciliables();
    const operaciones = await consultas.operacionesPorConciliar(env.pagosEntorno, adaptadores.map(pasarela => pasarela.medio),
      adaptadores.filter(pasarela => pasarela.requiereReferencia).map(pasarela => pasarela.medio));
    const resultados = await Promise.allSettled(operaciones.map(async operacion => {
      try {
        const vigente = await buscarOperacion(operacion.id);
        if (vigente) return await conciliarOperacion(vigente);
      } finally {
        await consultas.cederTurno(operacion.id);
      }
    }));
    const confirmadas = resultados.filter(resultado => resultado.status === 'fulfilled' && resultado.value === 'CONFIRMADO').length;
    return { confirmadas, pendientes: await consultas.contarPendientes(env.pagosEntorno) };
  }

  async function ofrecerTransferencia(pagoId: string, destino: DestinoTransferencia) {
    const anterior = await deps.transferencias.buscarDestinoTransferencia(pagoId);
    if (anterior) return anterior;
    return deps.transferencias.crearDestinoTransferencia(pagoId, destino);
  }

  async function declararTransferencia(pagoId: string, usuarioId: number, entrada: DeclaracionTransferencia, archivo?: ArchivoVoucher) {
    const datos = entradaTransferencia.parse(entrada);
    return iniciarOperacion(pagoId, usuarioId, { medio: 'TRANSFERENCIA', clave: datos.clave,
      cargaHash: createHash('sha256').update(JSON.stringify(archivo ? { ...datos, voucher: { hash: archivo.hash, tipo: archivo.tipo } } : datos)).digest('hex'),
      transferencia: datos, mesesRetencion: env.voucherRetencionMeses, ...(archivo ? { voucher: archivo } : {}) });
  }

  async function reponerVoucher(pagoId: string, operacionId: string, actorId: number, entrada: unknown) {
    const datos = entradaReposicionVoucher.parse(entrada);
    const archivo = validarArchivoVoucher(datos.voucher);
    return deps.transferencias.reponerVoucher(pagoId, operacionId, actorId, datos, archivo);
  }

  async function revisarTransferencia(pagoId: string, operacionId: string, actorId: number, entrada: RevisionTransferencia) {
    const datos = entradaRevisionTransferencia.parse(entrada);
    // La misma revisión repetida se reconoce por su hash y no se aplica dos veces.
    const revisionHash = createHash('sha256').update(JSON.stringify(datos)).digest('hex');
    return deps.transferencias.revisarTransferencia(pagoId, operacionId, actorId, datos, revisionHash);
  }

  function pdfComprobante(texto: string) {
    return crearPdfTexto('Comprobante de recepción - CPPP', texto.split('\n'));
  }

  async function obtenerComprobante(pagoId: string) {
    const fila = await consultas.leerComprobante(pagoId);
    if (!fila) return undefined;
    const { texto, curso, concepto, ...datos } = fila;
    return {
      datos: { ...datos, comisionCentimos: datos.totalCentimos - datos.baseCentimos, moneda: 'PEN' },
      texto: texto ?? [`Orden de pago: ${pagoId}`, `Curso: ${curso}`, `Concepto: ${concepto}`,
        ...lineasImporte(datos.baseCentimos, datos.totalCentimos), `Medio: ${datos.medio}`,
        `Referencia: ${datos.referencia}`, `Fecha: ${datos.fecha}`].join('\n'),
    };
  }

  function enviarNotificacionesPago() {
    return deps.procesarColaCorreo('pagos', aviso => aviso.tipo === 'COMPROBANTE' ? [{
      filename: `comprobante-${aviso.pagoId}.pdf`, contentType: 'application/pdf',
      content: pdfComprobante(aviso.texto),
    }] : undefined);
  }

  async function pagoAutorizado(id: string, usuario: Actor) {
    const pago = await obtenerPago(idCurso.parse(id));
    if (!pago) throw new ErrorPago(404, 'PAGO_NO_EXISTE', 'La obligación no existe.');
    if (usuario.role !== 'admin' && String(pago.usuarioId) !== String(usuario.id)) throw new ErrorPago(403, 'SIN_PERMISO', 'No tienes permiso para consultar esta obligación.');
    return pago;
  }

  const soloPropietario = (pago: Pago, usuario: Actor, mensaje: string) => {
    if (String(pago.usuarioId) !== String(usuario.id)) throw new ErrorPago(403, 'SIN_PERMISO', mensaje);
  };

  async function operacionDelPago(pago: Pago, operacionId: string) {
    const operacion = await buscarOperacion(operacionId);
    if (!operacion || operacion.pagoId !== pago.id) throw new ErrorPago(404, 'OPERACION_NO_EXISTE', 'La operación no pertenece a esta obligación.');
    return operacion;
  }

  return {
    mediosDisponibles, opcionesEnLinea, recuperarPagoEnLinea, iniciarPago, recuperarOperaciones,
    ofrecerTransferencia, declararTransferencia, reponerVoucher, revisarTransferencia, listarTransferencias: deps.transferencias.listarTransferencias,
    obtenerComprobante, pdfComprobante, enviarNotificacionesPago,

    /** Notificación de una pasarela; devuelve `limitada` si el origen superó 120 avisos por minuto. */
    async notificar(proveedorSolicitado: string, cuerpo: unknown, cabeceras: Parameters<NonNullable<ReturnType<typeof pasarelas.porRuta>>['notificar']>[1], ip: string) {
      const proveedor = rutaProveedor.parse(proveedorSolicitado);
      const pasarela = pasarelas.porRuta(proveedor);
      if (!pasarela) throw new ErrorPago(404, 'PASARELA_NO_EXISTE', 'La pasarela no existe.');
      if (!pasarela.conciliacion()) throw new ErrorPago(503, 'PASARELA_NO_CONFIGURADA', 'Esta pasarela todavía no está disponible.');
      const clave = `gestioncapa:${env.DB_NAME}:pagos:${proveedor}:${createHash('sha256').update(ip).digest('hex')}`;
      if (await consultas.contarNotificaciones(clave) > 120) return { limitada: true } as const;
      return { estado: await pasarela.notificar(cuerpo, cabeceras) };
    },

    async conciliar(id: string, usuario: Actor, cuerpo: unknown) {
      const pago = await pagoAutorizado(id, usuario);
      const entrada = entradaConciliacion.parse(cuerpo);
      const op = await buscarOperacion(entrada.operacionId);
      if (!op || op.pagoId !== pago.id) throw new ErrorPago(404, 'OPERACION_NO_EXISTE', 'La operación no pertenece a esta obligación.');
      return { estado: await conciliarOperacion(op, entrada.referencia) };
    },

    async detalle(id: string, usuario: Actor) {
      const pago = await pagoAutorizado(id, usuario);
      const contexto = await consultas.contextoPago(pago.id);
      const operaciones = await consultas.operacionesRecientes(pago.id);
      const incidencias = await consultas.incidenciasPago(pago.id);
      const destinoTransferencia = env.transferenciaHabilitada && pago.estado === 'PENDIENTE' ? await ofrecerTransferencia(pago.id, {
        banco: env.transferenciaBanco!, titular: env.transferenciaTitular!, cuenta: env.transferenciaCuenta!, cci: env.transferenciaCci!,
      }) : await deps.transferencias.buscarDestinoTransferencia(pago.id) ?? null;
      const notificaciones = await consultas.notificacionesPago(pago.id);
      const exigible = contexto?.exigible === true;
      const comprobante = pago.estado === 'PAGADO' ? await obtenerComprobante(pago.id) : undefined;
      return { ...pago, ...contexto, exigible,
        operaciones: operaciones.map(op => ({
          ...op, sesionRecuperable: op.sesionRecuperable && (pasarelas.porMedio(op.medio)?.altas() ?? false),
        })),
        incidencias, transferencias: await deps.transferencias.listarTransferencias(pago.id), destinoTransferencia, medios: mediosDisponibles(), notificaciones,
        opcionesEnLinea: exigible && pago.estado === 'PENDIENTE' ? opcionesEnLinea(pago) : [],
        comprobante: comprobante?.datos,
      };
    },

    async iniciarIntento(id: string, usuario: Actor, cuerpo: unknown) {
      const pago = await pagoAutorizado(id, usuario);
      soloPropietario(pago, usuario, 'Solo el propietario puede iniciar su pago.');
      return iniciarPago(pago, usuario.id, entradaIntento.parse(cuerpo));
    },

    async recuperarSesion(id: string, operacionId: string, usuario: Actor) {
      const pago = await pagoAutorizado(id, usuario);
      soloPropietario(pago, usuario, 'Solo el propietario puede recuperar la sesión.');
      return recuperarPagoEnLinea(await operacionDelPago(pago, idOperacion.parse(operacionId)));
    },

    async comprobante(id: string, usuario: Actor) {
      const pago = await pagoAutorizado(id, usuario);
      if (pago.estado !== 'PAGADO') throw new ErrorPago(409, 'PAGO_PENDIENTE', 'El comprobante estará disponible cuando se confirme el pago.');
      const comprobante = await obtenerComprobante(pago.id);
      if (!comprobante) throw new ErrorPago(409, 'COMPROBANTE_NO_DISPONIBLE', 'El comprobante requiere revisión del CPPP.');
      return { pagoId: pago.id, pdf: pdfComprobante(comprobante.texto) };
    },

    async registrarEfectivo(id: string, usuario: Actor, cuerpo: unknown) {
      const pago = await pagoAutorizado(id, usuario);
      const datos = entradaRecepcionEfectivo.parse(cuerpo);
      await registrarEfectivo(pago.id, usuario.id, datos.referencia, datos);
      return obtenerPago(pago.id);
    },

    async declararConVoucher(id: string, usuario: Actor, cuerpo: unknown) {
      const pago = await pagoAutorizado(id, usuario);
      const { voucher, ...datos } = entradaSubidaVoucher.parse(cuerpo);
      return declararTransferencia(pago.id, usuario.id, datos, validarArchivoVoucher(voucher));
    },

    async voucher(id: string, operacionId: string, usuario: Actor) {
      const pago = await pagoAutorizado(id, usuario);
      const operacion = idOperacion.parse(operacionId);
      const archivo = await deps.vouchers.obtenerVoucher(pago.id, operacion);
      const extension = archivo.tipo === 'application/pdf' ? 'pdf' : archivo.tipo === 'image/png' ? 'png' : 'jpg';
      return { ...archivo, nombre: `voucher-${operacion}.${extension}` };
    },

    async reponer(id: string, operacionId: string, usuario: Actor, cuerpo: unknown) {
      const pago = await pagoAutorizado(id, usuario);
      return { voucherId: await reponerVoucher(pago.id, idOperacion.parse(operacionId), usuario.id, cuerpo) };
    },

    async revisar(id: string, operacionId: string, usuario: Actor, cuerpo: unknown) {
      const pago = await pagoAutorizado(id, usuario);
      return { estado: await revisarTransferencia(pago.id, idOperacion.parse(operacionId), usuario.id, entradaRevisionTransferencia.parse(cuerpo)) };
    }
  };
}

export type PagosService = ReturnType<typeof crearPagosService>;
