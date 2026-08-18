import { Router } from "express";
import { validate } from "../middlewares/validation.middleware.js";
import { loginBody } from "../validators/auth.validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", validate(loginBody), authController.login);
router.get("/me", authMiddleware, authController.me);

export default router;
