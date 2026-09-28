const apiUrl = import.meta.env.VITE_BACKEND_URL ?? "";

export async function getHealth() {
  const response = await fetch(`${apiUrl}/api/health`);

  if (!response.ok) {
    throw new Error("No se pudo conectar con la API");
  }

  return response.json();
}
