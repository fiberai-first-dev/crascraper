import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import influencerRoutes from "./routes/influencer.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import * as authController from "./controllers/auth.controller.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "crafter-api" });
  });

  app.use("/api/auth", authRoutes);
  app.get("/api/me", authMiddleware, authController.me);
  app.use("/api/influencers", influencerRoutes);
  app.use("/api/campaigns", campaignRoutes);
  app.use("/api", dashboardRoutes);

  app.use(errorHandler);
  return app;
}
