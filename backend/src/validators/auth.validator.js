import { HttpError } from "../utils/errors.js";

export function loginBody(req) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) throw new HttpError(400, "Email and password are required");
  return { email, password };
}
