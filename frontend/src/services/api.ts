const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  })();

  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && !path.includes("/auth/login")) {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isLoggedIn");
    } catch {
      // ignore
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
