import assert from "node:assert/strict";
import { test } from "node:test";

type Configuracion = {
  combinarModulos: (actual: string | undefined, requeridos: string[]) => string;
  entornoSalaSegura: (texto: string) => string;
  componenteEventos: (datos: { dominio: string; apiPrefijo: string; secreto: string }) => string;
};
// El preparador es JavaScript sin compilar; se importa por URL para probar sus funciones puras.
const configuracion: Configuracion = await import(new URL("../../infraestructura/jitsi/configuracionJitsi.mjs", import.meta.url).href);

test("HU-26: combina los módulos de Prosody sin duplicarlos ni perder los existentes", () => {
  assert.equal(configuracion.combinarModulos("presence_identity, muc_size", ["presence_identity", "persistent_lobby"]), "presence_identity,muc_size,persistent_lobby");
  assert.equal(configuracion.combinarModulos(undefined, ["token_affiliation"]), "token_affiliation");
});

test("HU-26: el entorno exige JWT, sala de espera y desactiva la grabación en el servidor", () => {
  const resultado = configuracion.entornoSalaSegura("XMPP_DOMAIN=meet.cppp.pe\n#ENABLE_LOBBY=1\nXMPP_MUC_MODULES=token_affiliation\nENABLE_GUESTS=1\n");
  for (const linea of ["ENABLE_LOBBY=1", "ENABLE_GUESTS=0", "JWT_ALLOW_EMPTY=0", "ENABLE_RECORDING=0", "XMPP_MUC_MODULES=token_affiliation,token_lobby_ondemand", "XMPP_MODULES=presence_identity,persistent_lobby", "XMPP_DOMAIN=meet.cppp.pe"]) {
    assert.match(resultado, new RegExp(`^${linea}$`, "m"), linea);
  }
  assert.equal(resultado.match(/^ENABLE_LOBBY=/gm)?.length, 1);
});

test("HU26-12: el componente event_sync apunta al webhook con el secreto propio", () => {
  const texto = configuracion.componenteEventos({ dominio: "meet.cppp.pe", apiPrefijo: "http://172.17.0.1:8080/api/jitsi", secreto: "secretoEventos123" });
  assert.match(texto, /Component "eventos\.meet\.cppp\.pe" "event_sync_component"/);
  assert.match(texto, /muc_component = "conference\.meet\.cppp\.pe"/);
  assert.match(texto, /\["Authorization"\] = "Bearer secretoEventos123"/);
  assert.throws(() => configuracion.componenteEventos({ dominio: "meet.cppp.pe", apiPrefijo: "http://x/otra", secreto: "a" }), /api\/jitsi/);
  assert.throws(() => configuracion.componenteEventos({ dominio: "meet.cppp.pe", apiPrefijo: "http://x/api/jitsi", secreto: 'a"; os.execute("x") --' }), /secreto/);
});
