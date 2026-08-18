import { HttpError } from "../utils/errors.js";
import { campaignRepository } from "../repositories/campaign.repository.js";
import { influencerRepository } from "../repositories/influencer.repository.js";
import { influencerService } from "./influencer.service.js";
import { serializeStats } from "../utils/serialize.js";

const CAMPAIGN_STATUSES = new Set(["draft", "active", "paused", "completed", "archived"]);
export const CAMPAIGN_INFLUENCER_STATUSES = [
  "selected",
  "contacted",
  "negotiating",
  "approved",
  "content_pending",
  "posted",
  "completed",
];

export const campaignService = {
  list(userId) {
    return campaignRepository.listByUser(userId);
  },

  async getById(id, userId) {
    const campaign = await campaignRepository.findById(id, userId);
    if (!campaign) throw new HttpError(404, "Campaign not found");
    const [rawInfluencers, stats] = await Promise.all([
      campaignRepository.listInfluencers(id),
      campaignRepository.stats(id),
    ]);
    const influencers = await influencerRepository.attachNichesToMany(rawInfluencers);
    return { campaign, influencers, stats: serializeStats(stats) };
  },

  async create(userId, { name, description, influencerIds }) {
    if (!name?.trim()) throw new HttpError(400, "Campaign name is required");
    const ids = Array.isArray(influencerIds) ? [...new Set(influencerIds)] : [];
    if (!ids.length) throw new HttpError(400, "Select at least one influencer");
    const campaign = await campaignRepository.create({
      userId,
      name: name.trim(),
      description: description?.trim() || null,
      status: "active",
    });
    await campaignRepository.addInfluencers(campaign.id, ids);
    return this.getById(campaign.id, userId);
  },

  async update(id, userId, fields) {
    if (fields.status && !CAMPAIGN_STATUSES.has(fields.status)) {
      throw new HttpError(400, "Invalid campaign status");
    }
    const updated = await campaignRepository.update(id, userId, fields);
    if (!updated) throw new HttpError(404, "Campaign not found");
    return this.getById(id, userId);
  },

  async getInfluencers(id, userId) {
    const campaign = await campaignRepository.findById(id, userId);
    if (!campaign) throw new HttpError(404, "Campaign not found");
    return influencerRepository.attachNichesToMany(await campaignRepository.listInfluencers(id));
  },

  async getCampaignInfluencer(campaignId, influencerId, userId) {
    const campaign = await campaignRepository.findById(campaignId, userId);
    if (!campaign) throw new HttpError(404, "Campaign not found");
    const campaignInfluencer = await campaignRepository.findCampaignInfluencer(campaignId, influencerId);
    if (!campaignInfluencer) throw new HttpError(404, "Influencer is not in this campaign");
    const detail = await influencerService.getById(influencerId);
    if (!detail) throw new HttpError(404, "Influencer not found");
    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      campaignInfluencer,
      ...detail,
    };
  },

  async updateCampaignInfluencer(campaignId, influencerId, userId, fields) {
    const campaign = await campaignRepository.findById(campaignId, userId);
    if (!campaign) throw new HttpError(404, "Campaign not found");
    if (fields.status && !CAMPAIGN_INFLUENCER_STATUSES.includes(fields.status)) {
      throw new HttpError(400, "Invalid campaign influencer status");
    }
    const updated = await campaignRepository.updateCampaignInfluencer(campaignId, influencerId, fields);
    if (!updated) throw new HttpError(404, "Influencer is not in this campaign");
    await campaignRepository.update(campaignId, userId, {});
    return updated;
  },
};
