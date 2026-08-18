import { asyncHandler } from "../utils/errors.js";
import { influencerService } from "../services/influencer.service.js";
import { campaignRepository } from "../repositories/campaign.repository.js";
import { getDiscoveryStatus } from "../services/discovery.service.js";
import { toNumber } from "../utils/serialize.js";

export const summary = asyncHandler(async (req, res) => {
  const [influencerStats, campaignCount, campaigns, discovery] = await Promise.all([
    influencerService.dashboardStats(),
    campaignRepository.countByUser(req.user.id),
    campaignRepository.listByUser(req.user.id),
    getDiscoveryStatus(),
  ]);
  res.json({
    influencerCount: influencerStats.influencer_count,
    totalFollowers: influencerStats.total_followers,
    avgEngagement: influencerStats.avg_engagement,
    avgViews: influencerStats.avg_views,
    medianViews: influencerStats.median_views,
    campaignCount: toNumber(campaignCount) ?? 0,
    recentCampaigns: campaigns.slice(0, 5),
    discovery,
  });
});
