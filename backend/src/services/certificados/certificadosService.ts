import { randomBytes } from 'node:crypto';
import type { UsuarioAutenticado } from '../../plugins/autorizacion.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';
import { requisitoAsistencia, type CursoEmision, type DatosDocumento } from '../../entities/certificados/certificado.js';
import type * as Certificados from '../../repositories/certificados/certificadosRepository.js';
import { ocultarDni } from '../historial/historialCalculos.js';

type Actor = Pick<UsuarioAutenticado, 'id' | 'name' | 'email' | 'role'>;
type Cliente = Certificados.ClienteTransaccion;

export type CertificadosServiceDeps = {
  repositorio: typeof Certificados;
  crearConstancia: (datos: DatosDocumento, codigo: string, emitidoEn: string) => Promise<Uint8Array>;
  /** Ficha del curso que acompaña la vista de cierre. */
  obtenerCurso: (id: string) => Promise<unknown>;
};

const error = (status: number, code: string, message: string) => new ErrorAplicacion(status, code, message);
const nuevoCodigo = () => `CPPP-${randomBytes(16).toString('hex').toUpperCase()}`;

/** HU-36: la asistencia en aula (QR) y en la sala virtual (HU-26) cuentan igual para el 80 %. */
export function validarAlcance(curso: CursoEmision) {
  if (curso.modalidad === 'GRABADO') {
    throw error(409, 'CURSO_GRABADO', 'Los cursos grabados emitirán constancia cuando existan sus lecciones en video (HU-37).');
  }
  if (curso.tipoCertificado !== 'PARTICIPACION' || (curso.costo > 0 && !curso.modalidadCobro)) {
    throw error(409, 'CERTIFICACION_FUERA_ALCANCE', 'La emisión requiere participación sin examen y condiciones de cobro configuradas para los cursos con costo.');
  }
}

export function crearCertificadosService({ repositorio, crearConstancia, obtenerCurso }: CertificadosServiceDeps) {
  async function cursoAdministrable(cliente: Cliente, id: string, actor: Actor) {
    const curso = await repositorio.bloquearCursoAdministrable(cliente, id, actor.id);
    if (!curso) {
      const existe = await repositorio.existeCurso(cliente, id);
      throw error(existe ? 403 : 404, existe ? 'SIN_PERMISO' : 'CURSO_NO_EXISTE', existe ? 'No tienes permiso para gestionar certificados de este curso.' : 'El curso no existe.');
    }
    return curso;
  }

  async function datosConstancia(cliente: Cliente, curso: CursoEmision, usuarioId: string, anterior?: DatosDocumento): Promise<DatosDocumento> {
    if (anterior) return anterior;
    const titular = await repositorio.persona(cliente, usuarioId);
    const fechas = await repositorio.fechasCurso(cliente, curso.id);
    return { nombre: titular.nombre, dniEnmascarado: ocultarDni(titular.dni), curso: curso.titulo, modalidad: curso.modalidad,
      horasLectivas: curso.horasLectivas, fechaInicio: fechas.inicio, fechaFin: fechas.fin, instructorNombre: curso.instructorNombre, tipo: 'PARTICIPACION', demo: true };
  }

  async function emitir(cliente: Cliente, curso: CursoEmision, usuarioId: string, actor: Pick<Actor, 'id'>, motivo?: string, anterior?: DatosDocumento) {
    const datos = await datosConstancia(cliente, curso, usuarioId, anterior);
    const codigo = nuevoCodigo();
    const emitidoEn = new Date().toISOString();
    const archivo = await crearConstancia(datos, codigo, emitidoEn);
    const certificado = await repositorio.insertarCertificado(cliente, { cursoId: curso.id, usuarioId, codigo, emitidoEn, archivo, documento: datos, porExcepcion: !!motivo });
    await repositorio.auditar(cliente, actor, curso.id, motivo ? 'EXCEPCION' : 'EMITIR', codigo, motivo);
    await repositorio.avisarConstancia(cliente, curso.id, usuarioId, certificado.id, [
      datos.tipo === 'APROBACION' ? 'Tu certificado de aprobación ya está disponible.' : 'Tu constancia de participación ya está disponible.',
      `Horas lectivas: ${datos.horasLectivas}`,
    ]);
    return { codigo, datos };
  }

  /** Con cobro al certificado, la constancia queda retenida hasta confirmar el pago. */
  async function emitirSegunCobro(cliente: Cliente, curso: CursoEmision, usuarioId: string, actor: Actor, motivo?: string) {
    const intento = await repositorio.intentoInscripcion(cliente, curso.id, usuarioId);
    if (!intento && !(await repositorio.constanciaGratuitaLegada(cliente, curso.id, usuarioId))) {
      throw error(409, 'COBRO_HISTORICO_PENDIENTE', 'Regulariza las condiciones históricas de este participante antes de emitir su constancia.');
    }
    if (intento?.modalidadCobro !== 'CERTIFICADO') return { ...await emitir(cliente, curso, usuarioId, actor, motivo), retenida: false };
    const anterior = await repositorio.entregaAnterior(cliente, curso.id, usuarioId);
    if (anterior) return { codigo: null, retenida: true, pagoId: anterior.pagoId };
    const datos = await datosConstancia(cliente, curso, usuarioId);
    const pagoId = await repositorio.retenerConstancia(cliente, { cursoId: curso.id, usuarioId, intentoId: intento.id, importeCentimos: intento.importeCentimos,
      actorId: actor.id, documento: datos, motivo: motivo ?? null });
    await repositorio.auditar(cliente, actor, curso.id, 'RETENER', null, motivo ?? 'Constancia elegible retenida hasta confirmar el pago.');
    return { codigo: null, retenida: true, pagoId };
  }

  return {
    /** Proceso periódico: emite las constancias retenidas cuyo pago ya se confirmó. */
    async liberarRetenidas() {
      let emitidas = 0;
      for (const pendiente of await repositorio.entregasPagadasPendientes()) await repositorio.transaccion(async (cliente) => {
        await repositorio.bloquearCurso(cliente, pendiente.cursoId);
        const entrega = await repositorio.entregaPagada(cliente, pendiente.id);
        if (!entrega || entrega.estado !== 'RETENIDA') return;
        const actor = await repositorio.usuario(cliente, entrega.actorId);
        const curso = await repositorio.cursoEmision(cliente, pendiente.cursoId);
        const resultado = await emitir(cliente, curso, entrega.usuarioId, actor, entrega.motivo ?? undefined, entrega.datos);
        await repositorio.marcarEntregaEmitida(cliente, pendiente.id, resultado.codigo);
        await repositorio.auditar(cliente, actor, curso.id, 'LIBERAR_POR_PAGO', resultado.codigo, 'Emisión automática sobre elegibilidad previamente autorizada.');
        emitidas++;
      });
      return emitidas;
    },

    vistaCierre(id: string, actor: Actor, certificados = false) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor);
        if (!certificados && curso.estado === 'CERRADO') throw error(409, 'CURSO_CERRADO', 'El curso ya está cerrado. Consulta sus certificados.');
        if (!certificados) validarAlcance(curso);
        if (!certificados && curso.estado !== 'PUBLICADO') throw error(409, 'CURSO_NO_PUBLICADO', 'Publica el curso antes de cerrarlo.');
        const filas = await repositorio.filasCierre(cliente, id);
        const emitidos = await repositorio.certificadosDelCurso(cliente, id);
        const entregas = await repositorio.entregasDelCurso(cliente, id);
        return { curso: await obtenerCurso(id), requisitoAsistencia, filas: certificados ? filas.map((f) => {
          const certificado = emitidos.find((c) => c.usuarioId === f.agremiado.id);
          const entrega = entregas.find((e) => e.usuarioId === f.agremiado.id);
          return { ...f, entrega: entrega ? { estado: entrega.estado, pagoId: entrega.pagoId, estadoPago: entrega.estadoPago } : null,
            porExcepcion: certificado?.porExcepcion ?? false, certificado: certificado ? { codigo: certificado.codigo, estado: certificado.estado, nombre: certificado.nombre } : null };
        }) : filas };
      });
    },

    cerrarCurso(id: string, actor: Actor, excepciones: { agremiadoId: string; motivo: string }[]) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor); validarAlcance(curso);
        if (curso.estado === 'CERRADO') return { emitidos: await repositorio.contarCertificados(cliente, id), yaCerrado: true };
        if (curso.estado !== 'PUBLICADO') throw error(409, 'CURSO_NO_PUBLICADO', 'Publica el curso antes de cerrarlo.');
        await repositorio.bloquearSesiones(cliente, id);
        const periodo = await repositorio.periodoCurso(cliente, id);
        if (!periodo.sesiones || !periodo.terminado) throw error(409, 'SESIONES_PENDIENTES', 'El curso debe tener sesiones y todas deben haber terminado para cerrarlo.');
        if (!periodo.enPlazo) throw error(409, 'CIERRE_FUERA_PLAZO', 'El cierre automático de constancias debe realizarse dentro de los siete días siguientes a la última sesión.');
        const filas = await repositorio.filasCierre(cliente, id); const razones = new Map(excepciones.map((e) => [e.agremiadoId, e.motivo]));
        if (razones.size !== excepciones.length || excepciones.some((e) => !filas.some((f) => f.agremiado.id === e.agremiadoId))) {
          throw error(422, 'EXCEPCION_INVALIDA', 'Cada excepción debe corresponder a un inscrito distinto del curso.');
        }
        const anteriores = await repositorio.titularesConCertificado(cliente, id);
        const existentes = new Set(anteriores.map((c) => c.usuarioId));
        let emitidos = anteriores.length; let retenidos = 0;
        for (const fila of filas) if (!existentes.has(fila.agremiado.id) && (fila.cumple || razones.has(fila.agremiado.id))) {
          const resultado = await emitirSegunCobro(cliente, curso, fila.agremiado.id, actor, razones.get(fila.agremiado.id));
          if (resultado.retenida) retenidos++; else emitidos++;
        }
        await repositorio.marcarCursoCerrado(cliente, id);
        await repositorio.auditar(cliente, actor, id, 'CERRAR');
        return { emitidos, retenidos };
      });
    },

    excepcionCerrado(id: string, usuarioId: string, motivo: string, actor: Actor) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor); validarAlcance(curso);
        if (curso.estado !== 'CERRADO') throw error(409, 'CURSO_NO_CERRADO', 'Cierra el curso antes de emitir una excepción posterior.');
        const filas = await repositorio.filasCierre(cliente, id);
        if (!filas.some((f) => f.agremiado.id === usuarioId)) throw error(403, 'SIN_PERMISO', 'El colegiado no pertenece a este curso.');
        if (await repositorio.tieneCertificado(cliente, id, usuarioId)) throw error(409, 'CERTIFICADO_EXISTENTE', 'Ya existe un certificado para este colegiado.');
        return emitirSegunCobro(cliente, curso, usuarioId, actor, motivo);
      });
    },

    /** Verificación pública: solo datos impresos en la constancia. */
    async verificar(codigo: string) {
      const noExiste = () => error(404, 'CERTIFICADO_NO_EXISTE', 'No encontramos un certificado con ese código.');
      if (!/^[A-Z0-9-]{4,100}$/.test(codigo)) throw noExiste();
      const certificado = await repositorio.buscarCertificado(codigo);
      if (!certificado) throw noExiste();
      const { nombre, curso, horasLectivas, tipo, demo } = certificado.datos;
      return { codigo: certificado.codigo, estado: certificado.estado, reemplazadoPor: certificado.reemplazadoPor, nombre, curso, horasLectivas, tipo, emitidoEn: certificado.emitidoEn, demo };
    },

    /** Documento o archivo del titular o de un administrador, solo si sigue vigente. */
    async documento(codigo: string, actor: Actor, archivo: boolean) {
      const certificado = await repositorio.buscarCertificado(codigo, undefined, archivo);
      if (!certificado) throw error(404, 'CERTIFICADO_NO_EXISTE', 'No encontramos ese certificado.');
      if (!(await repositorio.puedeDescargar(actor.id, certificado.usuarioId))) throw error(403, 'SIN_PERMISO', 'No tienes permiso para descargar este certificado.');
      if (certificado.estado !== 'VALIDO') throw error(409, 'CERTIFICADO_NO_VIGENTE', 'El certificado fue anulado o reemplazado. Consulta su verificación pública.');
      return certificado;
    },

    /** Sin nombre anula; con nombre corrige emitiendo un reemplazo con código nuevo. */
    modificarCertificado(codigo: string, actor: Actor, motivo: string, nombre?: string) {
      return repositorio.transaccion(async (cliente) => {
        const inicial = await repositorio.buscarCertificado(codigo, cliente);
        if (!inicial) throw error(404, 'CERTIFICADO_NO_EXISTE', 'No encontramos ese certificado.');
        const curso = await cursoAdministrable(cliente, inicial.cursoId, actor);
        const actual = await repositorio.buscarCertificado(codigo, cliente);
        if (!actual || actual.estado !== 'VALIDO') throw error(409, 'CERTIFICADO_NO_VIGENTE', 'El certificado ya fue anulado o reemplazado.');
        if (!nombre) {
          await repositorio.anularCertificado(cliente, codigo);
          await repositorio.auditar(cliente, actor, curso.id, 'ANULAR', codigo, motivo); return null;
        }
        validarAlcance(curso);
        const reemplazo = nuevoCodigo();
        const datos = { ...actual.datos, nombre }; const emitidoEn = new Date().toISOString();
        const archivo = await crearConstancia(datos, reemplazo, emitidoEn);
        await repositorio.reemplazarCertificado(cliente, codigo, reemplazo, emitidoEn, archivo, datos);
        await repositorio.auditar(cliente, actor, curso.id, 'CORREGIR', codigo, motivo);
        return { codigo: reemplazo };
      });
    }
  };
}

export type CertificadosService = ReturnType<typeof crearCertificadosService>;
