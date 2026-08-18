import { query } from "../config/database.js";

export const scrapeJobRepository = {
  async create({ influencerId = null, candidateId = null, jobType = "refresh_influencer", payload = null }) {
    const { rows } = await query(
      `INSERT INTO scrape_jobs (influencer_id, candidate_id, status, job_type, payload)
       VALUES ($1, $2, 'queued', $3, $4)
       RETURNING *`,
      [influencerId, candidateId, jobType, payload ? JSON.stringify(payload) : null]
    );
    return rows[0];
  },

  async hasActiveJob(influencerId, jobType = "refresh_influencer") {
    const { rows } = await query(
      `SELECT 1
       FROM scrape_jobs
       WHERE influencer_id = $1
         AND job_type = $2
         AND status IN ('queued', 'processing')
       LIMIT 1`,
      [influencerId, jobType]
    );
    return Boolean(rows[0]);
  },

  async hasActiveJobType(jobType) {
    const { rows } = await query(
      `SELECT 1
       FROM scrape_jobs
       WHERE job_type = $1
         AND status IN ('queued', 'processing')
       LIMIT 1`,
      [jobType]
    );
    return Boolean(rows[0]);
  },

  async findById(id) {
    const { rows } = await query("SELECT * FROM scrape_jobs WHERE id = $1", [id]);
    return rows[0] || null;
  },
};
