import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createCampaignBody,
  updateCampaignBody,
  updateCampaignInfluencerBody,
} from "../validators/campaign.validator.js";
import * as campaignController from "../controllers/campaign.controller.js";

const router = Router();

router.use(authMiddleware);
router.get("/", campaignController.list);
router.post("/", validate(createCampaignBody), campaignController.create);
router.get("/:id/influencers/:influencerId", campaignController.getCampaignInfluencer);
router.patch(
  "/:id/influencers/:influencerId",
  validate(updateCampaignInfluencerBody),
  campaignController.updateCampaignInfluencer
);
router.get("/:id/influencers", campaignController.listInfluencers);
router.get("/:id", campaignController.getOne);
router.patch("/:id", validate(updateCampaignBody), campaignController.update);

export default router;
