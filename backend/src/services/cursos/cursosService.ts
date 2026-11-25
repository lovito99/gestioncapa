import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import { validarClase } from "../../dto/clases/claseDto.js";
import { entradaInscripcion, esquemaCambioCobro } from "../../dto/cursos/cobroDto.js";
import { esquemaConsultaCatalogo, esquemaCurso, esquemaMaterial, idCurso } from "../../dto/cursos/cursoDto.js";
import type { Curso } from "../../entities/cursos/curso.js";
import { urlPortadaPrivada, variantesPortada, type VariantePortada } from "../../entities/cursos/portada.js";
import type { ResultadoPortada } from "../../providers/cursos/portadaImagen.js";
import type * as Acceso from "../../repositories/cursos/accesoCursoRepository.js";
import type * as Cursos from "../../repositories/cursos/cursosRepository.js";
import type * as Portadas from "../../repositories/cursos/portadasRepository.js";
import type * as Sesiones from "../../repositories/cursos/sesionesCursoRepository.js";
import { precioDelTitular, type InscripcionService } from "./inscripcionService.js";

type Actor = Pick<UsuarioAutenticado, "id" | "role">;

export type CursosServiceDeps = {
  cursos: typeof Cursos;
  portadas: typeof Portadas;
  sesiones: typeof Sesiones;
  acceso: typeof Acceso;
  inscripciones: InscripcionService;
  procesarPortada: (entrada: unknown) => Promise<ResultadoPortada>;
  /** Origen público de enlaces e imágenes; nunca se deriva del host de la solicitud. */
  origenCatalogo: URL | null;
  configuracion: { inscripcionExternaHabilitada: boolean };
};

// Se mantiene el requisito vigente de asistencia del CPPP, igual que en el detalle autenticado.
const requisitoAsistencia = 80;
const error = (status: number, code: string, message: string) => new ErrorAplicacion(status, code, message);
const cursoNoExiste = () => error(404, "CURSO_NO_EXISTE", "El curso no existe.");
const portadaNoExiste = () => error(404, "PORTADA_NO_EXISTE", "La portada no está disponible.");
const accesoCursoDenegado = () => error(403, "SIN_PERMISO", "No tienes permiso para acceder a este curso.");
const esVariantePortada = (variante: string): variante is VariantePortada => Object.hasOwn(variantesPortada, variante);
const estadosInscripcion = { INSCRITO: "EN_CURSO", YA_INSCRITO: "EN_CURSO", YA_TERMINADO: "TERMINADO", INSCRITO_PENDIENTE: "PENDIENTE_PAGO", YA_PENDIENTE: "PENDIENTE_PAGO" } as const;

/** Lista explícita de campos públicos: nunca inscritos ni materiales. */
function resumenPublico({ id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, precioGeneral, cupos,
  cuposDisponibles, categoria, fechaInicio, fechaFin, modalidadCobro, plazoPagoMinutos, versionCobro, portadaUrl, portadaFuentes }: Curso, padronDisponible: boolean) {
  const admiteExternos = padronDisponible && (costo === 0 || (precioGeneral !== null && modalidadCobro !== null));
  return { id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, precioGeneral, cupos,
    cuposDisponibles, categoria, fechaInicio, fechaFin, modalidadCobro, plazoPagoMinutos, versionCobro,
    portadaUrl: portadaUrl ?? null, ...(portadaFuentes && { portadaFuentes }), ...(admiteExternos && { admiteExternos }) };
}

function puedeConsultarCurso(curso: Pick<Curso, "instructorId" | "estado">, usuario: Actor) {
  const asignado = curso.instructorId === String(usuario.id);
  return (usuario.role !== "instructor" || asignado) && (curso.estado !== "BORRADOR" || usuario.role === "admin" || asignado);
}

export function crearCursosService(deps: CursosServiceDeps) {
  const { cursos, portadas, sesiones, acceso, inscripciones } = deps;

  async function procesarPortada(entrada: unknown) {
    const resultado = await deps.procesarPortada(entrada);
    if (!resultado.ok) throw new ErrorAplicacion(422, resultado.code, resultado.message, { fields: { portada: resultado.message } });
    return resultado.portada;
  }

  async function cursoPublicado(id: string) {
    const curso = idCurso.safeParse(id).success ? await cursos.obtenerCursoPublicado(id) : null;
    if (!curso) throw cursoNoExiste();
    return curso;
  }

  async function cursoAutorizado(id: string, usuario: Actor) {
    if (!idCurso.safeParse(id).success) throw cursoNoExiste();
    const curso = await cursos.obtenerCurso(id, usuario.id);
    if (!curso) throw cursoNoExiste();
    if (!puedeConsultarCurso(curso, usuario)) throw accesoCursoDenegado();
    return curso;
  }

  return {
    async guardarPortada(id: string, entrada: unknown) {
      if (!idCurso.safeParse(id).success) throw cursoNoExiste();
      const portada = await procesarPortada(entrada);
      if (!(await portadas.guardarPortada(id, portada))) throw cursoNoExiste();
      return { portadaUrl: urlPortadaPrivada(id, portada.version) };
    },

    async retirarPortada(id: string) {
      if (!idCurso.safeParse(id).success || !(await portadas.retirarPortada(id))) throw cursoNoExiste();
    },

    async portadaPrivada(id: string, usuario: Actor) {
      if (!idCurso.safeParse(id).success) throw portadaNoExiste();
      const curso = await portadas.leerPortadaPrivada(id);
      if (!curso) throw portadaNoExiste();
      if (!puedeConsultarCurso(curso, usuario)) throw accesoCursoDenegado();
      if (!curso.archivo) throw portadaNoExiste();
      return curso.archivo;
    },

    async portadaPublica(id: string, version: string, variante: string) {
      if (!idCurso.safeParse(id).success || !/^[0-9a-f]{64}$/.test(version) || !esVariantePortada(variante)) throw portadaNoExiste();
      const archivo = await portadas.leerPortadaPublica(id, version, variante);
      if (!archivo) throw portadaNoExiste();
      return { archivo, tipo: variantesPortada[variante], etiqueta: `"${version}-${variante}"` };
    },

    async cambiarCobro(id: string, usuario: Actor, cuerpo: unknown) {
      const curso = await cursoAutorizado(id, usuario);
      const datos = esquemaCambioCobro.parse(cuerpo);
      if (!(await cursos.actualizarCobro(curso.id, datos))) {
        throw error(409, "COBRO_MODIFICADO", "El curso está cerrado o sus condiciones cambiaron. Recarga antes de guardar.");
      }
      return cursos.obtenerCurso(curso.id);
    },

    async catalogoPublico(consultaSolicitada: unknown) {
      const consulta = esquemaConsultaCatalogo.parse(consultaSolicitada);
      const [pagina, padronDisponible] = await Promise.all([cursos.paginaCatalogo(0, consulta, true), inscripciones.admiteInscripcionExterna()]);
      return { ...pagina, items: pagina.items.map((curso) => resumenPublico(curso, padronDisponible)) };
    },

    async cursoPublico(id: string) {
      const curso = await cursoPublicado(id);
      const [lista, padronDisponible] = await Promise.all([sesiones.listarSesiones(curso.id), inscripciones.admiteInscripcionExterna()]);
      // Lista explícita: sin salas, encargados, inscritos ni materiales.
      return { ...resumenPublico(curso, padronDisponible), tipoCertificado: curso.tipoCertificado, notaMinima: curso.notaMinima,
        requisitoAsistencia, vigente: curso.vigente,
        sesiones: lista.filter((sesion) => sesion.estado === "PROGRAMADA")
          .map(({ id: sesionId, nombre, fecha, horaInicio, horaFin, lugar, modalidad }) => ({ id: sesionId, nombre, fecha, horaInicio, horaFin, lugar, modalidad })) };
    },

    async compartir(id: string) {
      const curso = await cursoPublicado(id);
      if (!deps.origenCatalogo) throw error(503, "ORIGEN_NO_CONFIGURADO", "El enlace público del catálogo no está configurado.");
      const url = new URL(`/c/${curso.id}`, deps.origenCatalogo);
      const imagen = curso.portadaUrl ? { url: new URL(curso.portadaUrl, deps.origenCatalogo).href, ancho: 1280, alto: 720, tipo: "image/jpeg" } : null;
      return { url: url.href, enlaceCorto: `${url.host}${url.pathname}`,
        vistaPrevia: { titulo: curso.titulo, descripcion: curso.descripcion, categoria: curso.categoria, imagen } };
    },

    instructores: () => acceso.listarInstructoresActivos(),
    listar: (usuario: Actor) => cursos.listarCursos(usuario.role === "instructor" ? usuario.id : undefined),
    catalogo: () => cursos.listarCursos(undefined, true),
    paginaCatalogo: (usuario: Actor, consulta: unknown) => cursos.paginaCatalogo(usuario.id, esquemaConsultaCatalogo.parse(consulta)),

    /** Devuelve el impedimento del padrón para que el controlador lo responda con su estado. */
    async inscribirme(id: string, usuario: Actor, cuerpo: unknown) {
      if (!idCurso.safeParse(id).success) throw cursoNoExiste();
      const { versionCobro, tipoPrecio } = entradaInscripcion.parse(cuerpo ?? {});
      const resultado = await inscripciones.inscribir(id, usuario.id, versionCobro, tipoPrecio);
      if (typeof resultado === "object") return { impedimento: resultado } as const;
      if (resultado === "COBRO_NO_CONFIGURADO") throw error(409, resultado, "El administrador debe configurar las condiciones de cobro antes de nuevas inscripciones.");
      if (resultado === "COBRO_MODIFICADO") throw error(409, resultado, "Las condiciones cambiaron. Recarga el curso y confírmalas antes de inscribirte.");
      if (resultado === "NO_EXISTE") throw cursoNoExiste();
      if (resultado === "SIN_PERMISO") throw error(403, "SIN_PERMISO", "No tienes permiso para inscribirte en este curso.");
      if (resultado === "NO_PUBLICADO") throw error(409, "CURSO_NO_PUBLICADO", "El curso no está publicado.");
      if (resultado === "SIN_CUPOS") throw error(409, "SIN_CUPOS", "El curso está sin cupos. Elige otra capacitación.");
      const nueva = resultado === "INSCRITO" || resultado === "INSCRITO_PENDIENTE";
      const inscripcion = await cursos.obtenerMiInscripcion(id, usuario.id);
      return { nueva, cuerpo: { cursoId: id, estado: estadosInscripcion[resultado], yaInscrito: !nueva,
        intentoId: inscripcion?.intentoId ?? null, pagoId: inscripcion?.pagoId ?? null, venceEn: inscripcion?.venceEn ?? null } } as const;
    },

    async crear(cuerpo: unknown, usuarioId: number) {
      const { portada: entradaPortada, ...datos } = esquemaCurso.parse(cuerpo);
      const portada = entradaPortada === undefined ? undefined : await procesarPortada(entradaPortada);
      const id = await cursos.crearCurso(datos, usuarioId, portada);
      if (!id) throw new ErrorAplicacion(422, "VALIDACION", "Selecciona un instructor activo del CPPP.", { fields: { instructorId: "El instructor no está disponible." } });
      return { id, conPortada: Boolean(portada), curso: await cursos.obtenerCurso(id) };
    },

    async detalle(id: string, usuario: Actor) {
      const curso = await cursoAutorizado(id, usuario);
      const accesoContenido = await acceso.puedeAccederContenido(curso.id, usuario);
      const intento = curso.inscrito ? curso.miInscripcion : null;
      const faltaCotizar = deps.configuracion.inscripcionExternaHabilitada && curso.estado === "PUBLICADO" && !curso.inscrito;
      let cotizacion = {};
      if (usuario.role === "agremiado" && (faltaCotizar || intento?.tipoPrecio)) {
        const dni = await inscripciones.dniDe(usuario.id);
        cotizacion = intento?.tipoPrecio
          ? { miPrecio: precioDelTitular(intento.tipoPrecio, intento.importeCentimos / 100, dni) }
          : await inscripciones.cotizar(inscripciones.afiliacionDe, curso, usuario.id, dni);
      }
      return { ...curso, accesoContenido, ...cotizacion, modulos: accesoContenido ? curso.modulos : [] };
    },

    async miAsistencia(id: string, usuario: Actor) {
      const curso = await cursoAutorizado(id, usuario);
      return sesiones.asistenciaCurso(curso.id, usuario.id);
    },

    async programarSesion(id: string, usuario: Actor, cuerpoSolicitado: unknown) {
      const curso = await cursoAutorizado(id, usuario);
      if (curso.estado === "CERRADO") throw error(409, "CURSO_CERRADO", "El curso está cerrado y no admite nuevas sesiones.");
      if (curso.modalidad === "GRABADO") throw error(409, "CURSO_GRABADO", "Un curso grabado no tiene sesiones con fecha: su contenido son lecciones en video.");
      const cuerpo = typeof cuerpoSolicitado === "object" && cuerpoSolicitado !== null && !Array.isArray(cuerpoSolicitado) ? cuerpoSolicitado : {};
      // La sesión siempre la dicta el instructor del curso.
      const validacion = validarClase({ ...cuerpo, instructorId: curso.instructorId });
      if (!validacion.ok) throw new ErrorAplicacion(422, "VALIDACION", "Completa los datos de la sesión.", { fields: validacion.fields });
      const resultado = await sesiones.programarSesion(curso.id, validacion.datos, usuario.id);
      if ("encargadoNoValido" in resultado) throw new ErrorAplicacion(422, "VALIDACION", "Selecciona un instructor activo para la asistencia.",
        { fields: { encargadoId: "Selecciona un instructor activo para la asistencia." } });
      if (resultado.noDisponible) throw error(409, "CURSO_NO_DISPONIBLE", "El curso o su instructor ya no están disponibles para programar sesiones.");
      if (resultado.conflicto) {
        throw new ErrorAplicacion(409, "CONFLICTO_HORARIO", `El instructor ya tiene la clase «${resultado.conflicto.nombre}» en ese horario. Elige otro horario.`,
          { details: { claseId: resultado.conflicto.id } });
      }
      return resultado.sesion;
    },

    async publicar(id: string, usuario: Actor) {
      const curso = await cursoAutorizado(id, usuario);
      if (curso.estado === "CERRADO") throw error(409, "CURSO_CERRADO", "Un curso cerrado no se vuelve a publicar.");
      if (!(await cursos.publicarCurso(curso.id))) throw error(409, "CURSO_INCOMPLETO", "Agrega horas lectivas y módulos antes de publicar.");
      return cursos.obtenerCurso(curso.id);
    },

    async agregarMaterial(id: string, moduloId: string | undefined, usuario: Actor, cuerpo: unknown) {
      const curso = await cursoAutorizado(id, usuario);
      if (curso.instructorId !== String(usuario.id)) throw error(403, "SIN_PERMISO", "Solo el instructor asignado puede agregar material a este curso.");
      if (!idCurso.safeParse(moduloId).success || !curso.modulos.some((m) => m.id === moduloId)) throw error(404, "MODULO_NO_EXISTE", "El módulo no pertenece a este curso.");
      const datos = esquemaMaterial.parse(cuerpo);
      const material = await cursos.guardarMaterial(curso.id, moduloId!, usuario.id, datos);
      if (!material) throw error(403, "SIN_PERMISO", "No tienes permiso para agregar material a este módulo.");
      return { ...material, titulo: datos.titulo, tipo: datos.tipo, url: datos.tipo === "PDF" ? null : datos.url };
    },

    async archivoMaterial(id: string, moduloId: string | undefined, materialId: string | undefined, usuario: Actor) {
      const curso = await cursoAutorizado(id, usuario);
      if (!idCurso.safeParse(moduloId).success || !idCurso.safeParse(materialId).success) throw error(404, "MATERIAL_NO_EXISTE", "El archivo no existe.");
      if (!(await acceso.puedeAccederContenido(curso.id, usuario))) throw error(403, "CONTENIDO_NO_DISPONIBLE", "Necesitas una inscripción confirmada para acceder al contenido.");
      const archivo = await cursos.obtenerArchivo(curso.id, moduloId!, materialId!);
      if (!archivo) throw error(404, "MATERIAL_NO_EXISTE", "El archivo no existe en este módulo.");
      return archivo;
    }
  };
}

export type CursosService = ReturnType<typeof crearCursosService>;
