-- Catalog only creators with a public follower count of at least 1000.
-- Re-queue incomplete rows so the crawler can fill bio, avatar, and posts.

DELETE FROM influencers
WHERE followers IS NULL OR followers < 1000;

ALTER TABLE influencers
  DROP CONSTRAINT IF EXISTS influencers_min_followers;

ALTER TABLE influencers
  ADD CONSTRAINT influencers_min_followers
  CHECK (followers IS NOT NULL AND followers >= 1000);

UPDATE candidates c
SET status = 'pending',
    reject_reason = NULL,
    updated_at = NOW()
WHERE status = 'qualified'
  AND NOT EXISTS (
    SELECT 1 FROM influencers i
    WHERE lower(i.username) = lower(c.username)
      AND i.platform = c.platform
  );

UPDATE candidates c
SET status = 'pending',
    reject_reason = NULL,
    updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM influencers i
  WHERE lower(i.username) = lower(c.username)
    AND i.platform = c.platform
    AND (
      i.bio IS NULL
      OR i.profile_image_url IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM influencer_posts p WHERE p.influencer_id = i.id
      )
    )
);
