import { randomBytes } from 'node:crypto';
import type { UsuarioAutenticado } from '../../plugins/autorizacion.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';
import {
  requisitoAsistencia, type CursoEmision, type DatosDocumento, type EvaluacionCertificable, type FilaCierre
} from '../../entities/certificados/certificado.js';
import type * as Certificados from '../../repositories/certificados/certificadosRepository.js';
import type * as Evaluaciones from '../../repositories/evaluaciones/evaluacionesRepository.js';
import { ocultarDni } from '../historial/historialCalculos.js';

type Actor = Pick<UsuarioAutenticado, 'id' | 'name' | 'email' | 'role'>;
type Cliente = Certificados.ClienteTransaccion;

export type CertificadosServiceDeps = {
  repositorio: typeof Certificados;
  evaluaciones: Pick<typeof Evaluaciones, 'existeEvaluacionOficialPublicada' | 'consultarResultadoOficial' | 'consultarResultadosOficiales'>;
  crearConstancia: (datos: DatosDocumento, codigo: string, emitidoEn: string) => Promise<Uint8Array>;
  /** Ficha del curso que acompaña la vista de cierre. */
  obtenerCurso: (id: string) => Promise<unknown>;
};

const error = (status: number, code: string, message: string) => new ErrorAplicacion(status, code, message);
const nuevoCodigo = () => `CPPP-${randomBytes(16).toString('hex').toUpperCase()}`;

/** HU-36: la asistencia en aula (QR) y en la sala virtual (HU-26) cuentan igual para el 80 %. */
export function validarAlcance(curso: CursoEmision, evaluacionOficial = false) {
  const aprobacion = curso.tipoCertificado === 'APROBACION';
  if (curso.modalidad === 'GRABADO' && !(aprobacion && evaluacionOficial)) {
    throw error(409, 'CURSO_GRABADO', 'Para certificar un curso grabado, configura aprobación y publica el cuestionario de salida.');
  }
  if (!(curso.tipoCertificado === 'PARTICIPACION' || (aprobacion && evaluacionOficial)) || (curso.costo > 0 && !curso.modalidadCobro)) {
    throw error(409, 'CERTIFICACION_FUERA_ALCANCE', 'La emisión requiere una evaluación oficial para aprobar y condiciones de cobro configuradas para los cursos con costo.');
  }
}

const esAprobacion = (curso: CursoEmision) => curso.tipoCertificado === 'APROBACION';
const esEvaluacionIndividual = (curso: CursoEmision) => curso.modalidad === 'GRABADO' && esAprobacion(curso);
const tieneNotaAprobatoria = (resultado?: EvaluacionCertificable | null): resultado is EvaluacionCertificable & { nota: number } =>
  resultado?.aprobado === true && resultado.nota !== null;

export function crearCertificadosService({ repositorio, evaluaciones, crearConstancia, obtenerCurso }: CertificadosServiceDeps) {
  async function cursoAdministrable(cliente: Cliente, id: string, actor: Actor) {
    const curso = await repositorio.bloquearCursoAdministrable(cliente, id, actor.id);
    if (!curso) {
      const existe = await repositorio.existeCurso(cliente, id);
      throw error(existe ? 403 : 404, existe ? 'SIN_PERMISO' : 'CURSO_NO_EXISTE', existe ? 'No tienes permiso para gestionar certificados de este curso.' : 'El curso no existe.');
    }
    return curso;
  }

  async function validarCursoCertificable(cliente: Cliente, curso: CursoEmision) {
    validarAlcance(curso, esAprobacion(curso) && await evaluaciones.existeEvaluacionOficialPublicada(cliente, curso.id));
  }

  async function filasCertificables(cliente: Cliente, curso: CursoEmision): Promise<FilaCierre[]> {
    const filas = await repositorio.filasCierre(cliente, curso.id);
    if (!esAprobacion(curso)) return filas;
    const resultados = await evaluaciones.consultarResultadosOficiales(cliente, curso.id, filas.map(fila => fila.agremiado.id));
    return filas.map(fila => {
      const evaluacion = resultados.get(fila.agremiado.id) ?? null;
      const cumple = tieneNotaAprobatoria(evaluacion) &&
        (esEvaluacionIndividual(curso) ? evaluacion.avanceCompleto : fila.cumple);
      return { ...fila, evaluacion, cumple };
    });
  }

  async function datosConstancia(cliente: Cliente, curso: CursoEmision, usuarioId: string, nota?: number): Promise<DatosDocumento> {
    const titular = await repositorio.persona(cliente, usuarioId);
    const fechas = await repositorio.fechasCurso(cliente, curso.id);
    return { nombre: titular.nombre, dniEnmascarado: ocultarDni(titular.dni), curso: curso.titulo, modalidad: curso.modalidad,
      horasLectivas: curso.horasLectivas, fechaInicio: fechas.inicio, fechaFin: fechas.fin, instructorNombre: curso.instructorNombre,
      tipo: nota === undefined ? 'PARTICIPACION' : 'APROBACION', ...(nota === undefined ? {} : { nota }), demo: true };
  }

  async function emitir(cliente: Cliente, cursoId: string, usuarioId: string, actor: Pick<Actor, 'id'>, datos: DatosDocumento, motivo?: string) {
    const codigo = nuevoCodigo();
    const emitidoEn = new Date().toISOString();
    const archivo = await crearConstancia(datos, codigo, emitidoEn);
    const certificado = await repositorio.insertarCertificado(cliente, { cursoId, usuarioId, codigo, emitidoEn, archivo, documento: datos, porExcepcion: !!motivo });
    await repositorio.auditar(cliente, actor, cursoId, motivo ? 'EXCEPCION' : 'EMITIR', codigo, motivo);
    await repositorio.avisarConstancia(cliente, cursoId, usuarioId, certificado.id, [
      datos.tipo === 'APROBACION' ? 'Tu certificado de aprobación ya está disponible.' : 'Tu constancia de participación ya está disponible.',
      `Horas lectivas: ${datos.horasLectivas}`,
    ]);
    return codigo;
  }

  /** Con cobro al certificado, la constancia queda retenida hasta confirmar el pago. */
  async function emitirSegunCobro(cliente: Cliente, curso: CursoEmision, usuarioId: string, actor: Actor,
    { motivo, nota }: { motivo?: string | undefined; nota?: number | undefined } = {}) {
    const intento = await repositorio.intentoInscripcion(cliente, curso.id, usuarioId);
    if (!intento && !(await repositorio.constanciaGratuitaLegada(cliente, curso.id, usuarioId))) {
      throw error(409, 'COBRO_HISTORICO_PENDIENTE', 'Regulariza las condiciones históricas de este participante antes de emitir su constancia.');
    }
    if (intento?.modalidadCobro !== 'CERTIFICADO') {
      const datos = await datosConstancia(cliente, curso, usuarioId, nota);
      const codigo = await emitir(cliente, curso.id, usuarioId, actor, datos, motivo);
      return { codigo, retenida: false };
    }
    const anterior = await repositorio.entregaAnterior(cliente, curso.id, usuarioId);
    if (anterior) return { codigo: null, retenida: true, pagoId: anterior.pagoId };
    const datos = await datosConstancia(cliente, curso, usuarioId, nota);
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
        const codigo = await emitir(cliente, pendiente.cursoId, entrega.usuarioId, actor, entrega.datos, entrega.motivo ?? undefined);
        await repositorio.marcarEntregaEmitida(cliente, pendiente.id, codigo);
        await repositorio.auditar(cliente, actor, pendiente.cursoId, 'LIBERAR_POR_PAGO', codigo, 'Emisión automática sobre elegibilidad previamente autorizada.');
        emitidas++;
      });
      return emitidas;
    },

    vistaCierre(id: string, actor: Actor, certificados = false) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor);
        if (!certificados && curso.estado === 'CERRADO') throw error(409, 'CURSO_CERRADO', 'El curso ya está cerrado. Consulta sus certificados.');
        if (!certificados) await validarCursoCertificable(cliente, curso);
        if (!certificados && curso.estado !== 'PUBLICADO') throw error(409, 'CURSO_NO_PUBLICADO', 'Publica el curso antes de cerrarlo.');
        const base = { curso: await obtenerCurso(id), requisitoAsistencia };
        const filas = await filasCertificables(cliente, curso);
        const individual = esEvaluacionIndividual(curso);
        if (!certificados && !individual) return { ...base, filas };

        const emitidos = new Map((await repositorio.certificadosDelCurso(cliente, id)).map(fila => [fila.usuarioId, fila]));
        const entregas = new Map((await repositorio.entregasDelCurso(cliente, id)).map(fila => [fila.usuarioId, fila]));
        return { ...base, ...(individual ? { evaluacionIndividual: true } : {}), filas: filas.map(fila => {
          const certificado = emitidos.get(fila.agremiado.id);
          const entrega = entregas.get(fila.agremiado.id);
          return { ...fila, entrega: entrega ? { estado: entrega.estado, pagoId: entrega.pagoId, estadoPago: entrega.estadoPago } : null,
            porExcepcion: certificado?.porExcepcion ?? false,
            certificado: certificado ? { codigo: certificado.codigo, estado: certificado.estado, nombre: certificado.nombre } : null };
        }) };
      });
    },

    evaluarInscripcion(id: string, usuarioId: string, actor: Actor) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor);
        if (!esEvaluacionIndividual(curso)) {
          throw error(409, 'EVALUACION_INDIVIDUAL_NO_DISPONIBLE', 'La evaluación individual se usa en cursos grabados de aprobación.');
        }
        if (curso.estado !== 'PUBLICADO') throw error(409, 'CURSO_NO_PUBLICADO', 'El curso debe estar publicado para evaluar una inscripción.');
        await validarCursoCertificable(cliente, curso);
        if (!(await repositorio.bloquearInscripcionCertificable(cliente, id, usuarioId))) {
          throw error(403, 'COLEGIADO_SIN_ACCESO', 'El colegiado necesita una inscripción con acceso vigente al curso.');
        }
        const existente = await repositorio.certificadoActual(cliente, id, usuarioId);
        if (existente) {
          if (existente.estado !== 'VALIDO') throw error(409, 'CERTIFICADO_NO_VIGENTE', 'El certificado de esta inscripción fue anulado.');
          return { codigo: existente.codigo, retenida: false };
        }
        const anterior = await repositorio.entregaAnterior(cliente, id, usuarioId);
        if (anterior) return { codigo: null, retenida: true, pagoId: anterior.pagoId };
        const evaluacion = await evaluaciones.consultarResultadoOficial(cliente, id, usuarioId);
        if (!evaluacion?.avanceCompleto) throw error(409, 'AVANCE_INCOMPLETO', 'El colegiado debe completar todas las lecciones obligatorias.');
        if (!tieneNotaAprobatoria(evaluacion)) throw error(409, 'EVALUACION_NO_APROBADA', 'El colegiado debe aprobar el cuestionario de salida.');
        const resultado = await emitirSegunCobro(cliente, curso, usuarioId, actor, { nota: evaluacion.nota });
        await repositorio.marcarInscripcionTerminada(cliente, id, usuarioId);
        return resultado;
      });
    },

    cerrarCurso(id: string, actor: Actor, excepciones: { agremiadoId: string; motivo: string }[]) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor);
        await validarCursoCertificable(cliente, curso);
        if (esEvaluacionIndividual(curso)) {
          throw error(409, 'EVALUACION_INDIVIDUAL', 'Evalúa cada inscripción desde los certificados del curso grabado.');
        }
        if (curso.estado === 'CERRADO') return { emitidos: await repositorio.contarCertificados(cliente, id), yaCerrado: true };
        if (curso.estado !== 'PUBLICADO') throw error(409, 'CURSO_NO_PUBLICADO', 'Publica el curso antes de cerrarlo.');
        await repositorio.bloquearSesiones(cliente, id);
        const periodo = await repositorio.periodoCurso(cliente, id);
        if (!periodo.sesiones || !periodo.terminado) throw error(409, 'SESIONES_PENDIENTES', 'El curso debe tener sesiones y todas deben haber terminado para cerrarlo.');
        if (!periodo.enPlazo) throw error(409, 'CIERRE_FUERA_PLAZO', 'El cierre automático de constancias debe realizarse dentro de los siete días siguientes a la última sesión.');
        if (esAprobacion(curso) && excepciones.length > 0) {
          throw error(422, 'EXCEPCION_NO_DISPONIBLE', 'La aprobación requiere la nota mínima y la asistencia estipulada.');
        }
        const filas = await filasCertificables(cliente, curso);
        const razones = new Map(excepciones.map((e) => [e.agremiadoId, e.motivo]));
        if (razones.size !== excepciones.length || excepciones.some((e) => !filas.some((f) => f.agremiado.id === e.agremiadoId))) {
          throw error(422, 'EXCEPCION_INVALIDA', 'Cada excepción debe corresponder a un inscrito distinto del curso.');
        }
        const anteriores = await repositorio.titularesConCertificado(cliente, id);
        const existentes = new Set(anteriores.map((c) => c.usuarioId));
        let emitidos = anteriores.length; let retenidos = 0;
        for (const fila of filas) if (!existentes.has(fila.agremiado.id) && (fila.cumple || razones.has(fila.agremiado.id))) {
          const resultado = await emitirSegunCobro(cliente, curso, fila.agremiado.id, actor, {
            motivo: razones.get(fila.agremiado.id), nota: fila.evaluacion?.nota ?? undefined
          });
          if (resultado.retenida) retenidos++; else emitidos++;
        }
        await repositorio.marcarCursoCerrado(cliente, id);
        await repositorio.auditar(cliente, actor, id, 'CERRAR');
        return { emitidos, retenidos };
      });
    },

    excepcionCerrado(id: string, usuarioId: string, motivo: string, actor: Actor) {
      return repositorio.transaccion(async (cliente) => {
        const curso = await cursoAdministrable(cliente, id, actor);
        if (esAprobacion(curso)) throw error(422, 'EXCEPCION_NO_DISPONIBLE', 'Las excepciones se aplican únicamente a la participación.');
        validarAlcance(curso);
        if (curso.estado !== 'CERRADO') throw error(409, 'CURSO_NO_CERRADO', 'Cierra el curso antes de emitir una excepción posterior.');
        const filas = await repositorio.filasCierre(cliente, id);
        if (!filas.some((f) => f.agremiado.id === usuarioId)) throw error(403, 'SIN_PERMISO', 'El colegiado no pertenece a este curso.');
        if (await repositorio.tieneCertificado(cliente, id, usuarioId)) throw error(409, 'CERTIFICADO_EXISTENTE', 'Ya existe un certificado para este colegiado.');
        return emitirSegunCobro(cliente, curso, usuarioId, actor, { motivo });
      });
    },

    /** Verificación pública: datos mínimos de vigencia. */
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
        validarAlcance({ ...curso, tipoCertificado: actual.datos.tipo, modalidad: actual.datos.modalidad }, actual.datos.tipo === 'APROBACION');
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
