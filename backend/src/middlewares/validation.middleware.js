import { HttpError } from "../utils/errors.js";

export function validate(schemaFn) {
  return (req, res, next) => {
    try {
      req.validated = schemaFn(req);
      next();
    } catch (err) {
      next(err instanceof HttpError ? err : new HttpError(400, err.message));
    }
  };
}
