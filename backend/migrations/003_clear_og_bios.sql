-- Drop Open Graph SEO blurbs that were stored as bios.
UPDATE influencers
SET bio = NULL, updated_at = NOW()
WHERE bio ILIKE 'See Instagram photos and videos from%';
