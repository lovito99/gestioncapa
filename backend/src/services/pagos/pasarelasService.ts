import type { IncomingHttpHeaders } from 'node:http';
import { envolturaIzipay, idTransaccion, metadatosCargoCulqi, ordenIzipay, referenciaCargoCulqi } from '../../dto/pagos/pagoDto.js';
import { cotizarImporte, type InstrumentoPago, type OperacionPago, type Pago } from '../../entities/pagos/pago.js';
import type * as Culqi from '../../providers/pagos/culqi.js';
import type * as Izipay from '../../providers/pagos/izipay.js';
import type * as ProveedorHttp from '../../providers/pagos/proveedorHttp.js';
import type * as SesionCifrada from '../../providers/pagos/sesionCifrada.js';
import type * as Consultas from '../../repositories/pagos/consultasPagoRepository.js';
import type * as RepositorioPagos from '../../repositories/pagos/pagosRepository.js';
import { ErrorPago } from '../../shared/errorPago.js';
import type { OpcionPasarela } from './cotizacionPago.js';
import { crearRegistroPasarelas } from './pasarelasRegistro.js';

/** Configuración de pagos; se lee en cada uso para reflejar habilitaciones y credenciales vigentes. */
export type ConfiguracionPasarelas = Izipay.ConfigIzipay & {
  JWT_SECRET: string; izipayHabilitado: boolean; izipayConciliacionHabilitada: boolean;
  izipayComisionTarjeta?: number | undefined; izipayComisionYape?: number | undefined;
  culqiHabilitado: boolean; culqiClaveSecreta?: string | undefined;
};

export type PasarelasServiceDeps = {
  configuracion: ConfiguracionPasarelas;
  pagos: typeof RepositorioPagos;
  consultas: typeof Consultas;
  izipay: typeof Izipay;
  culqi: typeof Culqi;
  proveedorHttp: typeof ProveedorHttp;
  sesion: typeof SesionCifrada;
};

type AdaptadorPasarela = {
  medio: string;
  ruta: string;
  altas: () => boolean;
  conciliacion: () => boolean;
  requiereReferencia?: boolean;
  notificar: (entrada: unknown, cabeceras: IncomingHttpHeaders) => Promise<string>;
  conciliar: (operacion: OperacionPago, referencia?: string) => Promise<string>;
  opciones?: (pago: Pago) => OpcionPasarela[];
  abrir?: (operacion: OperacionPago, pago: Pago) => Promise<unknown>;
  recuperar?: (id: string) => Promise<unknown>;
};

/** Adaptadores intercambiables de pasarela (HU-54): altas, notificaciones firmadas y conciliación. */
export function crearPasarelasService(deps: PasarelasServiceDeps) {
  const env = deps.configuracion;
  const { consultas } = deps;
  const { buscarOperacion, buscarOperacionPorOrden, cambiarEstadoOperacion, confirmarOperacion, obtenerPago, conservarRespuestaMultiple } = deps.pagos;
  const { autenticarRespuestaIzipay, datosIzipay, interpretarRespuestaIzipay, consultarIzipay, crearSesionIzipay, limiteCentimosIzipay } = deps.izipay;
  const { consultarCargoCulqi, verificarCargoCulqi } = deps.culqi;
  const { solicitarProveedor } = deps.proveedorHttp;

  async function guardarSesionIzipay(operacionId: string, sesion: SesionCifrada.SesionIzipay) {
    await consultas.guardarSesionCifrada(operacionId, deps.sesion.cifrarSesion(operacionId, sesion, env.JWT_SECRET));
  }

  async function recuperarSesionIzipay(operacionId: string): Promise<SesionCifrada.SesionIzipay | undefined> {
    const cifrada = await consultas.leerSesionCifrada(operacionId, env.pagosEntorno);
    if (!cifrada) return;
    try { return deps.sesion.descifrarSesion(operacionId, cifrada, env.JWT_SECRET); }
    catch { throw new ErrorPago(503,'SESION_NO_RECUPERABLE','No se pudo recuperar la sesión. Consulta el estado con el CPPP antes de realizar otro pago.'); }
  }

  function leerJson(texto:string):unknown {
    try { return JSON.parse(texto); } catch { throw new ErrorPago(422,'NOTIFICACION_INVALIDA','La notificación no es válida.'); }
  }
  function objeto(valor:unknown):Record<string,unknown> {
    return valor!==null && typeof valor==='object' && !Array.isArray(valor) ? valor as Record<string,unknown> : {};
  }
  function comprobarMedio(op:OperacionPago,medio:'IZIPAY'|'CULQI') {
    if (op.medio!==medio || op.entorno!==env.pagosEntorno) throw new ErrorPago(422,'ENTORNO_INVALIDO','La operación no corresponde a esta pasarela o entorno.');
  }
  async function recibirIzipay(entrada:unknown, idCabecera?: string) {
    const raiz=objeto(entrada); const respuesta=objeto(raiz.response);
    const envoltura = envolturaIzipay.safeParse({
      payloadHttp:raiz.payloadHttp??respuesta.payloadHttp,signature:raiz.signature??respuesta.signature,
    });
    if (!envoltura.success) throw new ErrorPago(422,'NOTIFICACION_INVALIDA','Falta la respuesta firmada de Izipay.');
    const contenido=autenticarRespuestaIzipay(envoltura.data,env.izipayClaveHash!);
    const firmado=objeto(contenido);
    const datos=objeto(firmado.response);
    const primeraOrden=Array.isArray(datos.order) ? objeto(datos.order[0]) : {};
    const orden=ordenIzipay.safeParse(primeraOrden.orderNumber??datos.orderNumber);
    const id=idTransaccion.safeParse(firmado.transactionId);
    if (!id.success && !orden.success) throw new ErrorPago(422,'CORRELACION_INVALIDA','La operación no es válida.');
    const op=id.success ? await buscarOperacion(id.data)
      : await buscarOperacionPorOrden(orden.data!, 'IZIPAY', env.pagosEntorno);
    if (!op) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
    comprobarMedio(op,'IZIPAY');
    const pago=(await obtenerPago(op.pagoId))!;
    const esperado=datosIzipay(op,pago,env);
    if (idCabecera !== undefined && idCabecera !== esperado.transaccionId) {
      throw new ErrorPago(422,'CORRELACION_INVALIDA','La notificación no corresponde a la transacción esperada.');
    }
    const hecho=interpretarRespuestaIzipay(contenido,esperado);
    return aplicarRespuestaIzipay(op.id,hecho);
  }
  async function aplicarRespuestaIzipay(id:string,hecho:Awaited<ReturnType<typeof consultarIzipay>>) {
    if ('rechazado' in hecho) return cambiarEstadoOperacion(id, 'RECHAZADO');
    if ('cancelado' in hecho) return cambiarEstadoOperacion(id, 'CANCELADO');
    if (hecho.adicionales.length) return conservarRespuestaMultiple(id,[hecho,...hecho.adicionales]);
    return confirmarOperacion(id,hecho);
  }
  async function recibirCulqi(entrada:unknown) {
    let fuente=objeto(entrada);
    if (typeof fuente.id==='string' && /^evt_(test|live)_[A-Za-z0-9]+$/.test(fuente.id)) {
      fuente=objeto(await solicitarProveedor(`https://api.culqi.com/v2/events/${fuente.id}`,{headers:{Authorization:`Bearer ${env.culqiClaveSecreta}`}}));
    }
    const data=typeof fuente.data==='string' ? objeto(leerJson(fuente.data)) : objeto(fuente.data);
    const referencia=referenciaCargoCulqi.safeParse(data.id??fuente.id);
    if (!referencia.success) throw new ErrorPago(422,'CARGO_INVALIDO','La notificación no identifica un cargo.');
    const cargo=await consultarCargoCulqi(referencia.data,env.culqiClaveSecreta!);
    const meta=metadatosCargoCulqi.safeParse(cargo);
    if (!meta.success) throw new ErrorPago(422,'CORRELACION_INVALIDA','El cargo no pertenece a una operación registrada.');
    const op=await buscarOperacion(meta.data.metadata.operacionId);
    if (!op) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
    comprobarMedio(op,'CULQI');
    const hecho=verificarCargoCulqi(cargo,op,env.pagosEntorno);
    await consultas.guardarReferenciaExterna(op.id,hecho.referencia);
    return confirmarOperacion(op.id,hecho);
  }
  async function conciliarIzipay(op: OperacionPago) {
    comprobarMedio(op, 'IZIPAY');
    const pago=(await obtenerPago(op.pagoId))!;
    return aplicarRespuestaIzipay(op.id,await consultarIzipay(datosIzipay(op,pago,env),env));
  }
  async function conciliarCulqi(op: OperacionPago, referencia?:string) {
    comprobarMedio(op,'CULQI');
    const idCargo=referencia??op.referenciaExterna;
    if (!idCargo) throw new ErrorPago(409,'REFERENCIA_PENDIENTE','Consulta el cargo en el panel de Culqi y aporta su referencia para verificarlo.');
    const cargo=await consultarCargoCulqi(idCargo,env.culqiClaveSecreta!);
    return confirmarOperacion(op.id,verificarCargoCulqi(cargo,op,env.pagosEntorno));
  }

  async function abrirIzipay(operacion: OperacionPago, pago: Pago) {
    const datos = datosIzipay(operacion, pago, env);
    const token = await crearSesionIzipay(datos, env);
    const sesion = {
      token, keyRSA: env.izipayRsaPublica!, comercio: datos.comercio, orden: datos.orden,
      transaccionId: datos.transaccionId, importe: (datos.importeCentimos / 100).toFixed(2),
      urlIPN: new URL('/api/pagos/notificaciones/izipay', env.pagosUrlPublica).href, entorno: operacion.entorno,
      ...(operacion.instrumento && { instrumento: operacion.instrumento }),
    };
    await guardarSesionIzipay(operacion.id, sesion);
    return env.izipayHabilitado ? recuperarSesionIzipay(operacion.id) : undefined;
  }

  const pasarelas = crearRegistroPasarelas<AdaptadorPasarela>([
    {
      medio: 'IZIPAY', ruta: 'izipay',
      altas: () => env.izipayHabilitado,
      conciliacion: () => env.izipayHabilitado || env.izipayConciliacionHabilitada,
      notificar: (entrada, cabeceras) => {
        const transaccion = cabeceras.transactionid;
        return recibirIzipay(entrada, typeof transaccion === 'string' ? transaccion : undefined);
      },
      conciliar: conciliarIzipay, abrir: abrirIzipay, recuperar: recuperarSesionIzipay,
      opciones: pago => {
        const comercio = env.izipayCodigoComercio;
        if (!comercio) return [];
        const tarifas: [InstrumentoPago, number | undefined][] = [
          ['TARJETA', env.izipayComisionTarjeta], ['YAPE', env.izipayComisionYape],
        ];
        return tarifas.flatMap(([instrumento, puntosBase]) => {
          if (puntosBase === undefined || cotizarImporte(pago.importeCentimos, puntosBase).totalCentimos > limiteCentimosIzipay) return [];
          return [{ medio: 'IZIPAY', nombre: 'Izipay', comercio, instrumento, puntosBase }];
        });
      },
    },
    {
      medio: 'CULQI', ruta: 'culqi', altas: () => false, conciliacion: () => env.culqiHabilitado,
      requiereReferencia: true, notificar: recibirCulqi, conciliar: conciliarCulqi,
    },
  ]);

  function conciliarOperacion(operacion: OperacionPago, referencia?: string) {
    const pasarela = pasarelas.porMedio(operacion.medio);
    if (!pasarela?.conciliacion()) {
      throw new ErrorPago(503, 'PASARELA_NO_CONFIGURADA', 'La pasarela no está disponible para conciliar esta operación.');
    }
    return pasarela.conciliar(operacion, referencia);
  }

  return { pasarelas, conciliarOperacion, recuperarSesionIzipay };
}

export type PasarelasService = ReturnType<typeof crearPasarelasService>;
