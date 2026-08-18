import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import * as dashboardController from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/dashboard", authMiddleware, dashboardController.summary);

export default router;
