import { query } from "../config/database.js";
import { logger } from "../config/logger.js";
import { scrapeJobRepository } from "../repositories/scrape-job.repository.js";
import { publishScrapeJob } from "../queues/publisher.js";
import { toNumber } from "../utils/serialize.js";

export async function getDiscoveryStatus() {
  const catalog = await query("SELECT COUNT(*)::int AS count FROM influencers");
  let candidateRows = [];
  try {
    const result = await query(`SELECT status, COUNT(*)::int AS count FROM candidates GROUP BY status`);
    candidateRows = result.rows;
  } catch (err) {
    logger.warn(`Could not read candidates: ${err.message}`);
  }
  const byStatus = Object.fromEntries(candidateRows.map((row) => [row.status, toNumber(row.count) || 0]));
  const total = candidateRows.reduce((sum, row) => sum + (toNumber(row.count) || 0), 0);
  return {
    catalogCount: toNumber(catalog.rows[0].count) || 0,
    targetQualified: Number(process.env.TARGET_QUALIFIED || 1000),
    candidates: {
      pending: byStatus.pending || 0,
      queued: byStatus.queued || 0,
      processing: byStatus.processing || 0,
      qualified: byStatus.qualified || 0,
      rejected: byStatus.rejected || 0,
      blocked: byStatus.blocked || 0,
      failed: byStatus.failed || 0,
      total,
    },
  };
}

export async function queueSeedDiscovery() {
  try {
    const catalog = await query("SELECT COUNT(*)::int AS count FROM influencers");
    if (catalog.rows[0].count > 0) {
      logger.info("Creator catalog already has qualified rows; skip auto discovery");
      return;
    }
    const already = await scrapeJobRepository.hasActiveJobType("discover_seeds");
    if (already) {
      logger.info("Seed discovery already queued");
      return;
    }
    const job = await scrapeJobRepository.create({
      jobType: "discover_seeds",
      payload: { source: "instagram_profiles.csv" },
    });
    await publishScrapeJob({
      type: "discover_seeds",
      jobId: job.id,
    });
    logger.info("Queued discover_seeds job", job.id);
  } catch (err) {
    logger.warn(`Could not queue seed discovery: ${err.message}`);
  }
}
