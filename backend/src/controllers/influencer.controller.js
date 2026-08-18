import { asyncHandler, HttpError } from "../utils/errors.js";
import { influencerService } from "../services/influencer.service.js";

export const search = asyncHandler(async (req, res) => {
  const result = await influencerService.search(req.validated);
  res.json(result);
});

export const getOne = asyncHandler(async (req, res) => {
  const detail = await influencerService.getById(req.params.id);
  if (!detail) throw new HttpError(404, "Influencer not found");
  res.json(detail);
});

export const getMetrics = asyncHandler(async (req, res) => {
  const influencer = await influencerService.getById(req.params.id);
  if (!influencer) throw new HttpError(404, "Influencer not found");
  res.json({ metrics: influencer.metrics });
});

export const getPosts = asyncHandler(async (req, res) => {
  const influencer = await influencerService.getById(req.params.id);
  if (!influencer) throw new HttpError(404, "Influencer not found");
  res.json({ posts: influencer.posts });
});
