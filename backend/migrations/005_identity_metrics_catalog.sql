-- Identity vs metrics: influencers hold profile identity only.
-- Latest stats live in influencer_metrics and are read through influencer_catalog.
-- Posts get a stable unique key so profile scrapes do not wipe enriched details.

ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS following INTEGER;
ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS post_count INTEGER;
ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS engagement_rate_alt NUMERIC(8, 2);
ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS average_likes INTEGER;
ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS average_comments INTEGER;
ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS median_comments INTEGER;

INSERT INTO influencer_metrics (
  influencer_id, followers, following, post_count,
  engagement_rate, engagement_rate_alt,
  average_views, median_views, average_likes, average_comments,
  median_likes, median_comments, recorded_at
)
SELECT
  i.id, i.followers, i.following, i.post_count,
  i.engagement_rate, i.engagement_rate_alt,
  i.average_views, i.median_views, i.average_likes, i.average_comments,
  i.median_likes, i.median_comments, COALESCE(i.last_scraped_at, NOW())
FROM influencers i
WHERE i.followers IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM influencer_metrics m WHERE m.influencer_id = i.id
  );

UPDATE influencer_metrics m
SET
  following = COALESCE(m.following, i.following),
  post_count = COALESCE(m.post_count, i.post_count),
  engagement_rate_alt = COALESCE(m.engagement_rate_alt, i.engagement_rate_alt),
  average_likes = COALESCE(m.average_likes, i.average_likes),
  average_comments = COALESCE(m.average_comments, i.average_comments),
  median_comments = COALESCE(m.median_comments, i.median_comments)
FROM influencers i
WHERE m.influencer_id = i.id;

DELETE FROM influencer_posts a
USING influencer_posts b
WHERE a.influencer_id = b.influencer_id
  AND a.platform_post_id IS NOT NULL
  AND a.platform_post_id = b.platform_post_id
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_influencer_posts_unique
  ON influencer_posts (influencer_id, platform_post_id);

DROP INDEX IF EXISTS idx_influencers_search;
ALTER TABLE influencers DROP CONSTRAINT IF EXISTS influencers_min_followers;

ALTER TABLE influencers
  DROP COLUMN IF EXISTS followers,
  DROP COLUMN IF EXISTS following,
  DROP COLUMN IF EXISTS post_count,
  DROP COLUMN IF EXISTS engagement_rate,
  DROP COLUMN IF EXISTS engagement_rate_alt,
  DROP COLUMN IF EXISTS average_views,
  DROP COLUMN IF EXISTS average_likes,
  DROP COLUMN IF EXISTS average_comments,
  DROP COLUMN IF EXISTS median_likes,
  DROP COLUMN IF EXISTS median_comments,
  DROP COLUMN IF EXISTS median_views;

CREATE INDEX IF NOT EXISTS idx_influencers_search
  ON influencers (platform, location, niche);

ALTER TABLE influencer_posts ADD COLUMN IF NOT EXISTS details_status VARCHAR(50) NOT NULL DEFAULT 'pending';
UPDATE influencer_posts SET details_status = 'ready' WHERE likes IS NOT NULL;

CREATE OR REPLACE VIEW influencer_catalog AS
SELECT
  i.id,
  i.platform,
  i.username,
  i.display_name,
  i.profile_url,
  i.profile_image_url,
  i.bio,
  i.niche,
  i.sub_niche,
  i.location,
  i.is_verified,
  i.last_scraped_at,
  i.created_at,
  i.updated_at,
  m.followers,
  m.following,
  m.post_count,
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
