import { api } from "@/services/api";
import { User } from "@/types";
import { setSession } from "./auth.utils";

export async function login(email: string, password: string) {
  const result = await api<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(result.token, result.user);
  return result;
}

export async function fetchMe() {
  const result = await api<{ user: User }>("/api/me");
  return result.user;
}

export async function logout() {
  clearClientSession();
}

function clearClientSession() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
  } catch {
    // ignore
  }
}
