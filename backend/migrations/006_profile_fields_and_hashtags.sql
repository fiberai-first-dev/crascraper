-- Current profile facts live on influencers.
-- Derived post analytics and history stay in influencer_metrics.
-- Niches are classified from post captions and hashtags.

ALTER TABLE influencers ADD COLUMN IF NOT EXISTS followers INTEGER;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS following INTEGER;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS post_count INTEGER;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS is_private BOOLEAN;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS pronouns VARCHAR(100);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS language VARCHAR(20);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE influencers i
SET
  followers = COALESCE(i.followers, m.followers),
  following = COALESCE(i.following, m.following),
  post_count = COALESCE(i.post_count, m.post_count)
FROM (
  SELECT DISTINCT ON (influencer_id)
    influencer_id, followers, following, post_count
  FROM influencer_metrics
  ORDER BY influencer_id, recorded_at DESC
) m
WHERE m.influencer_id = i.id;

CREATE INDEX IF NOT EXISTS idx_influencers_followers ON influencers (followers);

ALTER TABLE influencer_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] NOT NULL DEFAULT '{}';

DROP VIEW IF EXISTS influencer_catalog;
CREATE VIEW influencer_catalog AS
SELECT
  i.id,
  i.platform,
  i.username,
  i.display_name,
  i.profile_url,
  i.profile_image_url,
  i.bio,
  i.followers,
  i.following,
  i.post_count,
  i.category,
  i.website_url,
  i.is_private,
  i.account_type,
  i.pronouns,
  i.language,
  i.extra,
  i.niche,
  i.sub_niche,
  i.location,
  i.is_verified,
  i.last_scraped_at,
  i.created_at,
  i.updated_at,
  m.engagement_rate,
  m.engagement_rate_alt,
  m.average_views,
  m.median_views,
  m.average_likes,
  m.average_comments,
  m.median_likes,
  m.median_comments
FROM influencers i
LEFT JOIN LATERAL (
  SELECT *
  FROM influencer_metrics
  WHERE influencer_id = i.id
  ORDER BY recorded_at DESC
  LIMIT 1
) m ON TRUE;
