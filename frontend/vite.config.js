import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_BACKEND_URL ?? "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": backendUrl
      }
    }
  };
});
