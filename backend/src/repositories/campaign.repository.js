import { query } from "../config/database.js";

export const campaignRepository = {
  async listByUser(userId) {
    const { rows } = await query(
      `SELECT c.*,
              COUNT(ci.id)::int AS influencer_count
       FROM campaigns c
       LEFT JOIN campaign_influencers ci ON ci.campaign_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    return rows;
  },

  async countByUser(userId) {
    const { rows } = await query("SELECT COUNT(*)::int AS count FROM campaigns WHERE user_id = $1", [userId]);
    return rows[0].count;
  },

  async findById(id, userId) {
    const { rows } = await query(
      `SELECT c.*,
              COUNT(ci.id)::int AS influencer_count
       FROM campaigns c
       LEFT JOIN campaign_influencers ci ON ci.campaign_id = c.id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async create({ userId, name, description, status = "active" }) {
    const { rows } = await query(
      `INSERT INTO campaigns (user_id, name, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, description || null, status]
    );
    return rows[0];
  },

  async update(id, userId, fields) {
    const { rows } = await query(
      `UPDATE campaigns
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, fields.name ?? null, fields.description ?? null, fields.status ?? null]
    );
    return rows[0] || null;
  },

  async addInfluencers(campaignId, influencerIds) {
    if (!influencerIds.length) return [];
    const values = [];
    const params = [];
    influencerIds.forEach((id, i) => {
      params.push(campaignId, id);
      const a = i * 2 + 1;
      const b = i * 2 + 2;
      values.push(`($${a}, $${b})`);
    });
    const { rows } = await query(
      `INSERT INTO campaign_influencers (campaign_id, influencer_id)
       VALUES ${values.join(", ")}
       ON CONFLICT (campaign_id, influencer_id) DO NOTHING
       RETURNING *`,
      params
    );
    return rows;
  },

  async listInfluencers(campaignId) {
    const { rows } = await query(
      `SELECT ci.id AS campaign_influencer_id,
              ci.status AS campaign_status,
              ci.notes,
              ci.deliverables,
              ci.contact_status,
              ci.content_status,
              ci.created_at AS selected_at,
              ci.updated_at AS campaign_updated_at,
              i.*,
              COALESCE(
                (SELECT JSON_AGG(JSON_BUILD_OBJECT('niche', n.niche, 'sub_niche', n.sub_niche))
                 FROM influencer_niches n WHERE n.influencer_id = i.id),
                CASE WHEN i.niche IS NOT NULL
                  THEN JSON_BUILD_ARRAY(JSON_BUILD_OBJECT('niche', i.niche, 'sub_niche', i.sub_niche))
                  ELSE '[]'::json
                END
              ) AS niches
       FROM campaign_influencers ci
       JOIN influencer_catalog i ON i.id = ci.influencer_id
       WHERE ci.campaign_id = $1`,
      [campaignId]
    );
    return rows;
  },

  async findCampaignInfluencer(campaignId, influencerId) {
    const { rows } = await query(
      `SELECT ci.id AS campaign_influencer_id,
              ci.campaign_id,
              ci.influencer_id,
              ci.status AS campaign_status,
              ci.notes,
              ci.deliverables,
              ci.contact_status,
              ci.content_status,
              ci.created_at AS selected_at,
              ci.updated_at AS campaign_updated_at
       FROM campaign_influencers ci
       WHERE ci.campaign_id = $1 AND ci.influencer_id = $2`,
      [campaignId, influencerId]
    );
    return rows[0] || null;
  },

  async updateCampaignInfluencer(campaignId, influencerId, fields) {
    const { rows } = await query(
      `UPDATE campaign_influencers
       SET status = COALESCE($3, status),
           notes = COALESCE($4, notes),
           deliverables = COALESCE($5, deliverables),
           contact_status = COALESCE($6, contact_status),
           content_status = COALESCE($7, content_status),
           updated_at = NOW()
       WHERE campaign_id = $1 AND influencer_id = $2
       RETURNING id AS campaign_influencer_id,
                 campaign_id,
                 influencer_id,
                 status AS campaign_status,
                 notes,
                 deliverables,
                 contact_status,
                 content_status,
                 created_at AS selected_at,
                 updated_at AS campaign_updated_at`,
      [
        campaignId,
        influencerId,
        fields.status ?? null,
        fields.notes ?? null,
        fields.deliverables ?? null,
        fields.contactStatus ?? null,
        fields.contentStatus ?? null,
      ]
    );
    return rows[0] || null;
  },

  async stats(campaignId) {
    const { rows } = await query(
      `SELECT
         COUNT(i.id)::int AS influencer_count,
         COALESCE(SUM(i.followers), 0)::bigint AS total_followers,
         ROUND(AVG(i.engagement_rate)::numeric, 2) AS avg_engagement,
         ROUND(AVG(i.average_views)::numeric, 0) AS avg_views,
         ROUND(AVG(i.median_views)::numeric, 0) AS median_views
       FROM campaign_influencers ci
       JOIN influencer_catalog i ON i.id = ci.influencer_id
       WHERE ci.campaign_id = $1`,
      [campaignId]
    );
    return rows[0];
  },
};
