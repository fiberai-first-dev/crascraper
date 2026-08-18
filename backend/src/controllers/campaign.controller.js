import { asyncHandler } from "../utils/errors.js";
import { campaignService } from "../services/campaign.service.js";

export const list = asyncHandler(async (req, res) => {
  const campaigns = await campaignService.list(req.user.id);
  res.json({ campaigns });
});

export const create = asyncHandler(async (req, res) => {
  const result = await campaignService.create(req.user.id, req.validated);
  res.status(201).json(result);
});

export const getOne = asyncHandler(async (req, res) => {
  const result = await campaignService.getById(req.params.id, req.user.id);
  res.json(result);
});

export const update = asyncHandler(async (req, res) => {
  const result = await campaignService.update(req.params.id, req.user.id, req.validated);
  res.json(result);
});

export const listInfluencers = asyncHandler(async (req, res) => {
  const influencers = await campaignService.getInfluencers(req.params.id, req.user.id);
  res.json({ influencers });
});

export const getCampaignInfluencer = asyncHandler(async (req, res) => {
  const result = await campaignService.getCampaignInfluencer(
    req.params.id,
    req.params.influencerId,
    req.user.id
  );
  res.json(result);
});

export const updateCampaignInfluencer = asyncHandler(async (req, res) => {
  const campaignInfluencer = await campaignService.updateCampaignInfluencer(
    req.params.id,
    req.params.influencerId,
    req.user.id,
    req.validated
  );
  res.json({ campaignInfluencer });
});
