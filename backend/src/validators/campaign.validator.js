import { HttpError } from "../utils/errors.js";
import { parseOptionalString } from "../utils/parse.js";

export function createCampaignBody(req) {
  const name = parseOptionalString(req.body?.name);
  const description = parseOptionalString(req.body?.description);
  const influencerIds = Array.isArray(req.body?.influencerIds) ? req.body.influencerIds : [];
  if (!name) throw new HttpError(400, "Campaign name is required");
  if (!influencerIds.length) throw new HttpError(400, "Select at least one influencer");
  return { name, description, influencerIds };
}

export function updateCampaignBody(req) {
  return {
    name: parseOptionalString(req.body?.name),
    description: parseOptionalString(req.body?.description),
    status: parseOptionalString(req.body?.status),
  };
}

export function updateCampaignInfluencerBody(req) {
  return {
    status: parseOptionalString(req.body?.status),
    notes: req.body?.notes === undefined ? null : String(req.body.notes),
    deliverables: req.body?.deliverables === undefined ? null : String(req.body.deliverables),
    contactStatus: parseOptionalString(req.body?.contactStatus),
    contentStatus: parseOptionalString(req.body?.contentStatus),
  };
}
