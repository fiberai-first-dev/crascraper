import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";
import { authService } from "../services/auth.service.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, "Unauthorized"));
  try {
    const payload = authService.verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(new HttpError(401, "Unauthorized"));
  }
}

export { env };
