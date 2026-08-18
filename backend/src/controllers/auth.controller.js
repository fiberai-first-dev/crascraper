import { asyncHandler } from "../utils/errors.js";
import { authService } from "../services/auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated;
  const result = await authService.login(email, password);
  res.json(result);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ user });
});
