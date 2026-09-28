const apiUrl = import.meta.env.VITE_BACKEND_URL ?? "";

export async function getHealth() {
  const response = await fetch(`${apiUrl}/api/health`);

  if (!response.ok) {
    throw new Error("No se pudo conectar con la API");
  }

  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Credenciales invalidas");
  }

  return response.json();
}

export async function getCurrentUser(token) {
  const response = await fetch(`${apiUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Sesion no valida");
  }

  return response.json();
}
