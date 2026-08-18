export interface User {
  id: string;
  email: string;
  name: string;
}

export interface NicheTag {
  niche: string;
  sub_niche: string | null;
}

export interface Influencer {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  post_count: number | null;
  engagement_rate: number | string | null;
  engagement_rate_alt?: number | string | null;
  average_views: number | null;
  median_views: number | null;
  average_likes: number | null;
  average_comments: number | null;
  median_likes: number | null;
  median_comments: number | null;
  niche: string | null;
  sub_niche: string | null;
  niches?: NicheTag[];
  location: string | null;
  is_verified: boolean;
  category?: string | null;
  website_url?: string | null;
  is_private?: boolean | null;
  account_type?: string | null;
  pronouns?: string | null;
  language?: string | null;
  extra?: Record<string, unknown>;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InfluencerMetric {
  id: string;
  influencer_id: string;
  followers: number | null;
  engagement_rate: number | string | null;
  average_views: number | null;
  median_views?: number | null;
  recorded_at: string;
}

export interface InfluencerPost {
  id: string;
  influencer_id: string;
  platform_post_id: string | null;
  post_url: string | null;
  post_type: string | null;
  caption: string | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  hashtags?: string[];
  published_at: string | null;
  collected_at: string;
}

export interface Analytics {
  averageLikes: number | null;
  averageComments: number | null;
  medianLikes: number | null;
  medianComments: number | null;
  averageViews: number | null;
  medianViews: number | null;
  engagementRate: number | null;
  engagementRateAlt: number | null;
  followerGrowth: number | null;
}

export interface InfluencerDetail {
  influencer: Influencer;
  metrics: InfluencerMetric[];
  posts: InfluencerPost[];
  analytics: Analytics;
}

export interface SearchFilters {
  platform: string;
  location: string;
  niche: string;
  search: string;
  minFollowers: string;
  maxFollowers: string;
  minEngagementRate: string;
  maxEngagementRate: string;
  minAverageViews: string;
  maxAverageViews: string;
  minMedianViews: string;
  maxMedianViews: string;
  limit: string;
  page: number;
  sortBy: string;
  sortOrder: string;
}

export interface SearchResponse {
  items: Influencer[];
  total: number;
  page: number;
  limit: number;
  queuedRefreshIds: string[];
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  influencer_count?: number;
}

export interface CampaignInfluencer extends Influencer {
  campaign_influencer_id: string;
  campaign_status: string;
  notes: string | null;
  deliverables: string | null;
  contact_status: string | null;
  content_status: string | null;
  selected_at: string;
  campaign_updated_at: string;
}

export interface CampaignDetail {
  campaign: Campaign;
  influencers: CampaignInfluencer[];
  stats: {
    influencer_count: number;
    total_followers: number | string;
    avg_engagement: number | string | null;
    avg_views: number | string | null;
    median_views?: number | string | null;
  };
}

export interface CampaignInfluencerDetail extends InfluencerDetail {
  campaign: { id: string; name: string; status: string };
  campaignInfluencer: {
    campaign_influencer_id: string;
    campaign_id: string;
    influencer_id: string;
    campaign_status: string;
    notes: string | null;
    deliverables: string | null;
    contact_status: string | null;
    content_status: string | null;
    selected_at: string;
    campaign_updated_at: string;
  };
}

export interface DiscoveryStatus {
  catalogCount: number;
  targetQualified: number;
  candidates: {
    pending: number;
    queued: number;
    processing: number;
    qualified: number;
    rejected: number;
    blocked: number;
    failed: number;
    total: number;
  };
}

export interface DashboardSummary {
  influencerCount: number;
  totalFollowers: number;
  avgEngagement: number | null;
  avgViews: number | null;
  medianViews: number | null;
  campaignCount: number;
  recentCampaigns: Campaign[];
  discovery?: DiscoveryStatus;
}

export const CAMPAIGN_INFLUENCER_STATUSES = [
  "selected",
  "contacted",
  "negotiating",
  "approved",
  "content_pending",
  "posted",
  "completed",
] as const;
