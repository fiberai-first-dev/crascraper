import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { influencerRepository } from "../repositories/influencer.repository.js";
import { scrapeJobRepository } from "../repositories/scrape-job.repository.js";
import { publishScrapeJob } from "../queues/publisher.js";

function isStale(influencer) {
  if (!influencer.last_scraped_at) return true;
  const ageMs = Date.now() - new Date(influencer.last_scraped_at).getTime();
  return ageMs > env.staleAfterHours * 60 * 60 * 1000;
}

function computeFollowerGrowth(metrics) {
  if (!metrics || metrics.length < 2) return null;
  const first = metrics[0].followers;
  const last = metrics[metrics.length - 1].followers;
  if (first == null || last == null || first === 0) return null;
  return Number((((last - first) / first) * 100).toFixed(2));
}

function analyticsFrom(influencer, metrics) {
  return {
    averageLikes: influencer.average_likes ?? null,
    averageComments: influencer.average_comments ?? null,
    medianLikes: influencer.median_likes ?? null,
    medianComments: influencer.median_comments ?? null,
    averageViews: influencer.average_views ?? null,
    medianViews: influencer.median_views ?? null,
    engagementRate: influencer.engagement_rate != null ? Number(influencer.engagement_rate) : null,
    engagementRateAlt: influencer.engagement_rate_alt != null ? Number(influencer.engagement_rate_alt) : null,
    followerGrowth: computeFollowerGrowth(metrics),
  };
}

export const influencerService = {
  async search(filters) {
    const result = await influencerRepository.search(filters);
    const queuedRefreshIds = [];
    const stale = result.items.filter(isStale).slice(0, env.maxRefreshJobsPerSearch);

    for (const influencer of stale) {
      try {
        const already = await scrapeJobRepository.hasActiveJob(influencer.id);
        if (already) {
          queuedRefreshIds.push(influencer.id);
          continue;
        }
        const job = await scrapeJobRepository.create({
          influencerId: influencer.id,
          jobType: "refresh_influencer",
        });
        await publishScrapeJob({
          type: "refresh_influencer",
          jobId: job.id,
          influencerId: influencer.id,
          platform: influencer.platform,
          username: influencer.username,
        });
        queuedRefreshIds.push(influencer.id);
      } catch (err) {
        logger.warn(`Could not queue refresh for ${influencer.username}: ${err.message}`);
      }
    }

    return { ...result, queuedRefreshIds };
  },

  async getById(id) {
    const influencer = await influencerRepository.findById(id);
    if (!influencer) return null;
    const [metrics, posts] = await Promise.all([
      influencerRepository.findMetrics(id),
      influencerRepository.findPosts(id),
    ]);
    return {
      influencer,
      metrics,
      posts,
      analytics: analyticsFrom(influencer, metrics),
    };
  },

  async getMetrics(id) {
    return influencerRepository.findMetrics(id);
  },

  async getPosts(id) {
    return influencerRepository.findPosts(id);
  },

  dashboardStats() {
    return influencerRepository.dashboardStats();
  },
};
