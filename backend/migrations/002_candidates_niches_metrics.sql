-- Candidates, multi-niche, median metrics, job payload.

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
  username VARCHAR(255) NOT NULL,
  profile_url TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'seed',
  discovered_from VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  followers INTEGER,
  seed_niches TEXT[] NOT NULL DEFAULT '{}',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, username)
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates (status);

CREATE TABLE IF NOT EXISTS influencer_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers (id) ON DELETE CASCADE,
  niche VARCHAR(100) NOT NULL,
  sub_niche VARCHAR(100),
  UNIQUE (influencer_id, niche)
);

CREATE INDEX IF NOT EXISTS idx_influencer_niches_niche ON influencer_niches (niche);

ALTER TABLE influencers ADD COLUMN IF NOT EXISTS median_likes INTEGER;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS median_comments INTEGER;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS median_views INTEGER;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS engagement_rate_alt NUMERIC(8, 2);

ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS median_views INTEGER;
ALTER TABLE influencer_metrics ADD COLUMN IF NOT EXISTS median_likes INTEGER;

ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates (id) ON DELETE SET NULL;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS payload JSONB;

-- Drop generated demo catalog from the earlier MVP seed (not real public handles).
DELETE FROM influencers
WHERE username IN ('meera.style.lab', 'kabir.threads', 'ananya.atelier')
   OR username ~ '^[a-z]+\.(fits|studio|label|closet|edit)[0-9]+$'
   OR username ~ '^[a-z]+\.[a-z]+[0-9]{1,3}$';


ALTER TABLE candidates ADD COLUMN IF NOT EXISTS discovered_from VARCHAR(255);
