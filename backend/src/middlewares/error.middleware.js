import { logger } from "../config/logger.js";
import { HttpError } from "../utils/errors.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err instanceof HttpError ? err.status : err.status || 500;
  if (status >= 500) logger.error(err.stack || err.message);
  res.status(status).json({
    message: status === 500 ? "Internal server error" : err.message,
  });
}
