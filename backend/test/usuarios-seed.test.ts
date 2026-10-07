import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { usuariosSeed } from "../src/modules/auth/usuarios-seed.js";

const admin = {
  ADMIN_NAME: "Administrador",
  ADMIN_EMAIL: "Admin@GestionCapa.local",
  ADMIN_PASSWORD: "ClavePropia123!"
};

describe("Característica: Entorno local reproducible", () => {
  test("AMB-02: Dado desarrollo, cuando se calculan los usuarios, entonces hay uno por cada rol", () => {
    const usuarios = usuariosSeed({ ...admin, NODE_ENV: "development" });
    const roles = new Set(usuarios.map((u) => u.role));

    assert.deepEqual([...roles].sort(), ["admin", "coordinador", "instructor", "participante"]);
    assert.equal(usuarios[0]?.email, "admin@gestioncapa.local");
    assert.equal(usuarios[0]?.password, admin.ADMIN_PASSWORD);
  });

  test("AMB-03: Dado los usuarios del seed, cuando se revisan los correos, entonces no hay duplicados", () => {
    const correos = usuariosSeed({ ...admin, NODE_ENV: "test" }).map((u) => u.email);

    assert.equal(new Set(correos).size, correos.length);
  });

  test("SOL-02: Dado desarrollo, cuando se calculan los usuarios, entonces hay dos instructores", () => {
    const instructores = usuariosSeed({ ...admin, NODE_ENV: "development" }).filter((u) => u.role === "instructor");

    assert.deepEqual(instructores.map((u) => u.name).sort(), ["Carlos Mendoza Ríos", "Lucía Paredes Quispe"]);
  });

  test("AMB-04: Dado producción, cuando se calculan los usuarios, entonces solo está el administrador", () => {
    const usuarios = usuariosSeed({ ...admin, NODE_ENV: "production" });

    assert.deepEqual(usuarios.map((u) => u.role), ["admin"]);
  });
});
