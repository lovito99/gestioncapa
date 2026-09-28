import { useEffect, useState } from "react";
import { getCurrentUser, getHealth, login } from "./services/api.js";

const tokenStorageKey = "gestioncapa.token";

export function App() {
  const [health, setHealth] = useState({ status: "checking" });
  const [view, setView] = useState("landing");
  const [session, setSession] = useState({ status: "anonymous" });
  const [form, setForm] = useState({
    email: "admin@gestioncapa.local",
    password: "CambiaEstaClave123!"
  });
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then((data) => setHealth({ status: "online", data }))
      .catch(() => setHealth({ status: "offline" }));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(tokenStorageKey);

    if (!token) {
      return;
    }

    getCurrentUser(token)
      .then(({ user }) => {
        setSession({ status: "authenticated", token, user });
        setView("dashboard");
      })
      .catch(() => localStorage.removeItem(tokenStorageKey));
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSession({ status: "loading" });

    try {
      const data = await login(form.email, form.password);
      localStorage.setItem(tokenStorageKey, data.token);
      setSession({ status: "authenticated", token: data.token, user: data.user });
      setView("dashboard");
    } catch (loginError) {
      setSession({ status: "anonymous" });
      setError(loginError.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem(tokenStorageKey);
    setSession({ status: "anonymous" });
    setView("landing");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <strong>GestionCapa</strong>
        <nav>
          <button type="button" onClick={() => setView("landing")}>
            Inicio
          </button>
          {session.status === "authenticated" ? (
            <button type="button" onClick={() => setView("dashboard")}>
              Panel
            </button>
          ) : (
            <button type="button" onClick={() => setView("login")}>
              Login
            </button>
          )}
        </nav>
      </header>

      {view === "landing" && (
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">GestionCapa</p>
            <h1>Gestion operativa con acceso seguro</h1>
            <p className="intro">
              Base moderna con Node 24, backend TypeScript, Postgres, Redis,
              JWT y frontend Vite listo para crecer por modulos.
            </p>
            <button className="primary-action" type="button" onClick={() => setView("login")}>
              Entrar al sistema
            </button>
          </div>
          <ApiStatus health={health} />
        </section>
      )}

      {view === "login" && (
        <section className="auth-layout">
          <form className="auth-panel" onSubmit={handleLogin}>
            <p className="eyebrow">Acceso</p>
            <h1>Iniciar sesion</h1>
            <label>
              Correo
              <input
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Clave
              <input
                autoComplete="current-password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-action" type="submit">
              {session.status === "loading" ? "Validando..." : "Ingresar"}
            </button>
          </form>
        </section>
      )}

      {view === "dashboard" && session.status === "authenticated" && (
        <section className="dashboard">
          <div>
            <p className="eyebrow">Panel autenticado</p>
            <h1>Hola, {session.user.name}</h1>
            <p className="intro">
              Tu sesion esta protegida con JWT y respaldada por Postgres. Redis
              queda listo para colas, sesiones o limites de uso.
            </p>
          </div>
          <div className="dashboard-grid">
            <ApiStatus health={health} />
            <article className="status-panel">
              <span className="status-dot status-dot--online" />
              <div>
                <strong>{session.user.role}</strong>
                <p>{session.user.email}</p>
              </div>
            </article>
          </div>
          <button type="button" className="secondary-action" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </section>
      )}
    </main>
  );
}

function ApiStatus({ health }) {
  return (
    <article className="status-panel">
      <span className={`status-dot status-dot--${health.status}`} />
      <div>
        <strong>API</strong>
        <p>{health.status}</p>
      </div>
    </article>
  );
}
