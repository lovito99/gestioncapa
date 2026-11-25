import type { RegistroPuertaDto } from "../../dto/asistencia/asistenciaPuertaDto.js";
import type { MarcaPuerta } from "../../entities/asistencia/asistenciaPuerta.js";
import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import type { AsistenciaPuertaRepository, AsistenciaPuertaTransaccion } from "../../repositories/asistencia/asistenciaPuertaRepository.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import { verificarQrPersonal } from "../qr/qrPersonal.js";

type ActorPuerta = Pick<UsuarioAutenticado, "id" | "role">;
type ClaseAutorizada = NonNullable<Awaited<ReturnType<AsistenciaPuertaTransaccion["acceso"]>>>;

const qrInvalido = () => new ErrorAplicacion(422, "QR_PERSONAL_INVALIDO", "Este código no es un QR personal vigente de asistencia.");

export function crearAsistenciaPuertaService(repositorio: AsistenciaPuertaRepository, secreto: string) {
  function enPuertaAutorizada<T>(claseId: number | null, actor: ActorPuerta,
    trabajo: (tx: AsistenciaPuertaTransaccion, clase: ClaseAutorizada) => Promise<T>) {
    if (!claseId) throw new ErrorAplicacion(404, "CLASE_NO_EXISTE", "La sesión no existe.");
    return repositorio.enClaseBloqueada(claseId, async (tx) => {
      const clase = await tx.acceso(actor.id);
      if (!clase) throw new ErrorAplicacion(404, "CLASE_NO_EXISTE", "La sesión no existe.");
      if (!clase.operador) throw new ErrorAplicacion(403, "SIN_PERMISO", "La puerta está reservada al encargado de asistencia y al administrador.");
      if (clase.estado === "CANCELADA") throw new ErrorAplicacion(409, "CLASE_CANCELADA", "La sesión está cancelada.");
      if (clase.virtual) throw new ErrorAplicacion(409, "SESION_VIRTUAL", "Esta sesión registra asistencia en la sala virtual.");
      if (clase.cursoCerrado) throw new ErrorAplicacion(409, "CURSO_CERRADO", "El curso ya está cerrado.");
      return trabajo(tx, clase);
    });
  }

  return {
    delegadas: repositorio.sesionesDelegadas,

    contexto: (id: number | null, actor: ActorPuerta) =>
      enPuertaAutorizada(id, actor, async (tx, clase) => {
        const { id, nombre, fecha, horaInicio, lugar, curso } = clase;
        const conteos = await tx.conteos();
        const recientes = await tx.recientes();
        return {
          clase: { id, nombre, fecha, horaInicio, lugar, curso },
          ...conteos, recientes, verListaCompleta: actor.role === "admin" || String(actor.id) === clase.instructorId
        };
      }),

    buscarDni: (id: number | null, actor: ActorPuerta, dni: string) =>
      enPuertaAutorizada(id, actor, async (tx) =>
        ({ resultados: await tx.buscarDni(dni) })),

    registrar: (id: number | null, actor: ActorPuerta, entrada: RegistroPuertaDto): Promise<MarcaPuerta> =>
      enPuertaAutorizada(id, actor, async (tx) => {
        const metodo = "token" in entrada ? "QR" : "DNI";
        let participanteId: string | undefined;
        if ("token" in entrada) {
          const identificador = verificarQrPersonal(entrada.token, secreto);
          if (!identificador) throw qrInvalido();
          participanteId = await tx.idDeCredencial(identificador);
          if (!participanteId) throw qrInvalido();
        } else {
          participanteId = entrada.participanteId;
        }
        const participante = await tx.inscrito(participanteId);
        if (!participante) throw new ErrorAplicacion(409, "NO_INSCRITO", "No encontramos una inscripción vigente para este colegiado en la sesión.");

        const marca = await tx.registrar(participante.id, actor.id, metodo === "QR" ? "QR_PUERTA" : "DNI");
        if (!marca) {
          const anterior = await tx.marcaAnterior(participante.id);
          if (!anterior) throw new ErrorAplicacion(409, "ASISTENCIA_CAMBIO", "La marca se corrigió durante el registro. Confirma y vuelve a intentarlo.");
          throw new ErrorAplicacion(409, "ASISTENCIA_YA_REGISTRADA", "La asistencia ya estaba registrada en esta sesión.",
            { details: { participante, horaRegistro: anterior.horaRegistro } });
        }
        return { ...marca, participante, metodo };
      }),

    deshacer: (id: number | null, actor: ActorPuerta, marcaId: string) =>
      enPuertaAutorizada(id, actor, async (tx) => {
        if (!(await tx.rectificar(marcaId, actor.id, actor.role === "admin"))) {
          throw new ErrorAplicacion(409, "MARCA_NO_RECTIFICABLE", "Esta marca ya no se puede deshacer desde la puerta.");
        }
      })
  };
}
