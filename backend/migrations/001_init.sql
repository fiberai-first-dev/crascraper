CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_url TEXT,
  profile_image_url TEXT,
  bio TEXT,
  followers INTEGER,
  following INTEGER,
  post_count INTEGER,
  engagement_rate NUMERIC(8, 2),
  average_views INTEGER,
  average_likes INTEGER,
  average_comments INTEGER,
  niche VARCHAR(100),
  sub_niche VARCHAR(100),
  location VARCHAR(255),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, username)
);

CREATE INDEX IF NOT EXISTS idx_influencers_search
  ON influencers (platform, location, niche, followers, engagement_rate);
CREATE INDEX IF NOT EXISTS idx_influencers_username ON influencers (username);
CREATE INDEX IF NOT EXISTS idx_influencers_stale ON influencers (last_scraped_at);

CREATE TABLE IF NOT EXISTS influencer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers (id) ON DELETE CASCADE,
  followers INTEGER,
  engagement_rate NUMERIC(8, 2),
  average_views INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_influencer
  ON influencer_metrics (influencer_id, recorded_at);

CREATE TABLE IF NOT EXISTS influencer_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers (id) ON DELETE CASCADE,
  platform_post_id VARCHAR(255),
  post_url TEXT,
  post_type VARCHAR(50),
  caption TEXT,
  likes INTEGER,
  comments INTEGER,
  views INTEGER,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_influencer
  ON influencer_posts (influencer_id, published_at DESC);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers (id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'selected',
  notes TEXT,
  deliverables TEXT,
  contact_status VARCHAR(50),
  content_status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_influencers_campaign
  ON campaign_influencers (campaign_id);

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID REFERENCES influencers (id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  job_type VARCHAR(50) NOT NULL DEFAULT 'refresh_influencer',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_influencer ON scrape_jobs (influencer_id, status);
