import { query } from "../config/database.js";
import { serializeInfluencer, serializeMetric, serializePost, serializeStats } from "../utils/serialize.js";

function buildSearchWhere(filters) {
  const clauses = ["TRUE"];
  const params = [];

  function add(clause, value) {
    params.push(value);
    clauses.push(clause.replaceAll("?", `$${params.length}`));
  }

  if (filters.platform) add("i.platform = ?", filters.platform);
  if (filters.location) add("i.location ILIKE ?", `%${filters.location}%`);
  if (filters.niche) {
    params.push(filters.niche);
    const idx = params.length;
    clauses.push(
      `(EXISTS (SELECT 1 FROM influencer_niches n WHERE n.influencer_id = i.id AND n.niche ILIKE '%' || $${idx} || '%') OR i.niche ILIKE '%' || $${idx} || '%')`
    );
  }
  if (filters.minFollowers != null) add("i.followers >= ?", filters.minFollowers);
  if (filters.maxFollowers != null) add("i.followers <= ?", filters.maxFollowers);
  if (filters.minEngagementRate != null) add("i.engagement_rate >= ?", filters.minEngagementRate);
  if (filters.maxEngagementRate != null) add("i.engagement_rate <= ?", filters.maxEngagementRate);
  if (filters.minAverageViews != null) add("COALESCE(i.median_views, i.average_views) >= ?", filters.minAverageViews);
  if (filters.maxAverageViews != null) add("COALESCE(i.median_views, i.average_views) <= ?", filters.maxAverageViews);
  if (filters.minMedianViews != null) add("i.median_views >= ?", filters.minMedianViews);
  if (filters.maxMedianViews != null) add("i.median_views <= ?", filters.maxMedianViews);
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    clauses.push(`(i.username ILIKE $${idx} OR i.display_name ILIKE $${idx})`);
  }

  return {
    where: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

async function attachNiches(rows) {
  if (!rows.length) return rows.map(serializeInfluencer);
  const ids = rows.map((r) => r.id);
  const { rows: niches } = await query(
    `SELECT influencer_id, niche, sub_niche FROM influencer_niches WHERE influencer_id = ANY($1::uuid[])`,
    [ids]
  );
  const map = new Map();
  for (const n of niches) {
    const key = String(n.influencer_id);
    const list = map.get(key) || [];
    list.push({ niche: n.niche, sub_niche: n.sub_niche });
    map.set(key, list);
  }
  return rows.map((row) =>
    serializeInfluencer({
      ...row,
      niches: map.get(String(row.id)) || (row.niche ? [{ niche: row.niche, sub_niche: row.sub_niche }] : []),
    })
  );
}

export const influencerRepository = {
  async search(filters) {
    const { where, params } = buildSearchWhere(filters);
    const limit = filters.limit;
    const page = filters.page;
    const offset = (page - 1) * limit;

    const sortField = {
      followers: "followers",
      engagement_rate: "engagement_rate",
      average_views: "average_views",
      median_views: "median_views",
      updated_at: "updated_at"
    }[filters.sortBy] || "followers";
    const sortDir = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const orderClause = `ORDER BY ${sortField} ${sortDir} NULLS LAST`;

    const countResult = await query(`SELECT COUNT(*)::int AS total FROM influencer_catalog i ${where}`, params);
    const listResult = await query(
      `SELECT i.* FROM influencer_catalog i ${where} ${orderClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      items: await attachNiches(listResult.rows),
      total: Number(countResult.rows[0].total) || 0,
      page,
      limit,
    };
  },

  attachNichesToMany(rows) {
    return attachNiches(rows);
  },

  async findById(id) {
    const { rows } = await query("SELECT * FROM influencer_catalog WHERE id = $1", [id]);
    if (!rows[0]) return null;
    const [withNiches] = await attachNiches(rows);
    return withNiches;
  },

  async findMetrics(id) {
    const { rows } = await query(
      `SELECT * FROM influencer_metrics
       WHERE influencer_id = $1
       ORDER BY recorded_at ASC`,
      [id]
    );
    return rows.map(serializeMetric);
  },

  async findPosts(id) {
    const { rows } = await query(
      `SELECT * FROM influencer_posts
       WHERE influencer_id = $1
       ORDER BY published_at DESC NULLS LAST
       LIMIT 12`,
      [id]
    );
    return rows.map(serializePost);
  },

  async dashboardStats() {
    const { rows } = await query(`
      SELECT
        COUNT(*)::int AS influencer_count,
        COALESCE(SUM(followers), 0)::bigint AS total_followers,
        ROUND(AVG(engagement_rate)::numeric, 2) AS avg_engagement,
        ROUND(AVG(COALESCE(median_views, average_views))::numeric, 0) AS avg_views,
        ROUND(AVG(median_views)::numeric, 0) AS median_views
      FROM influencer_catalog
    `);
    return serializeStats(rows[0]);
  },
};
