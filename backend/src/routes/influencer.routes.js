import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { searchBody } from "../validators/influencer.validator.js";
import * as influencerController from "../controllers/influencer.controller.js";

const router = Router();

router.use(authMiddleware);
router.post("/search", validate(searchBody), influencerController.search);
router.get("/:id/metrics", influencerController.getMetrics);
router.get("/:id/posts", influencerController.getPosts);
router.get("/:id", influencerController.getOne);

export default router;
