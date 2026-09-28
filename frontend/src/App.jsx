import { useEffect, useState } from "react";
import { getHealth } from "./services/api.js";

export function App() {
  const [health, setHealth] = useState({ status: "checking" });

  useEffect(() => {
    getHealth()
      .then((data) => setHealth({ status: "online", data }))
      .catch(() => setHealth({ status: "offline" }));
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace">
        <div>
          <p className="eyebrow">GestionCapa</p>
          <h1>Base lista para crecer</h1>
          <p className="intro">
            Backend TypeScript en Node 24, frontend Vite con React y una
            estructura separada para modulos, servicios y configuracion.
          </p>
        </div>

        <div className="status-panel">
          <span className={`status-dot status-dot--${health.status}`} />
          <div>
            <strong>API</strong>
            <p>{health.status}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
