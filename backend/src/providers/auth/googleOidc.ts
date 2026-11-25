import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { IdentidadGoogle } from "../../entities/auth/identidadGoogle.js";

export const origenGoogle = "https://accounts.google.com";
const clavesGoogle = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), { timeoutDuration: 4000 });
const claimsGoogle = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(180),
  email_verified: z.literal(true),
  nonce: z.string(),
  hd: z.string().min(1).optional(),
  azp: z.string().min(1).optional()
});

export async function validarIdentidadGoogle(token: string, cliente: string, nonce: string,
  claves: Parameters<typeof jwtVerify>[1] = clavesGoogle): Promise<IdentidadGoogle> {
  const { payload } = await jwtVerify(token, claves, {
    algorithms: ["RS256"], issuer: [origenGoogle, "accounts.google.com"], audience: cliente,
    requiredClaims: ["exp", "iat", "sub", "nonce"], maxTokenAge: "10 minutes", clockTolerance: 5
  });
  const claims = claimsGoogle.parse(payload);
  const audienciaUnica = Array.isArray(payload.aud)
    ? payload.aud.length === 1 && payload.aud[0] === cliente
    : payload.aud === cliente;
  if (!audienciaUnica || claims.nonce !== nonce || (claims.azp !== undefined && claims.azp !== cliente)) {
    throw new Error("Identidad de Google inválida.");
  }
  const correo = claims.email.toLowerCase();
  return {
    emisor: origenGoogle, sujeto: claims.sub, correo,
    correoAutoritativo: correo.endsWith("@gmail.com") || Boolean(claims.hd)
  };
}

export function crearGoogleOidc(configuracion: { cliente: string; secreto: string; callback: string }) {
  return {
    autorizar(state: string, nonce: string, verificador: string) {
      const url = new URL("/o/oauth2/v2/auth", origenGoogle);
      url.search = new URLSearchParams({
        client_id: configuracion.cliente, redirect_uri: configuracion.callback, response_type: "code",
        scope: "openid email", state, nonce, code_challenge_method: "S256",
        code_challenge: createHash("sha256").update(verificador).digest("base64url"),
        prompt: "select_account"
      }).toString();
      return url.href;
    },

    async intercambiar(codigo: string, nonce: string, verificador: string) {
      const respuesta = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(4500),
        body: new URLSearchParams({
          grant_type: "authorization_code", code: codigo, code_verifier: verificador,
          client_id: configuracion.cliente, client_secret: configuracion.secreto, redirect_uri: configuracion.callback
        })
      });
      if (!respuesta.ok) {
        await respuesta.body?.cancel();
        throw new Error("Google rechazó el intercambio.");
      }
      const { id_token: token } = z.object({ id_token: z.string().min(1).max(12000) }).parse(await respuesta.json());
      return validarIdentidadGoogle(token, configuracion.cliente, nonce);
    }
  };
}

export type GoogleOidc = ReturnType<typeof crearGoogleOidc>;
