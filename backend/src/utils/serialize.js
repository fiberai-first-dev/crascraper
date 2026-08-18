export function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function serializeInfluencer(row) {
  if (!row) return row;
  return {
    ...row,
    followers: toNumber(row.followers),
    following: toNumber(row.following),
    post_count: toNumber(row.post_count),
    engagement_rate: toNumber(row.engagement_rate),
    engagement_rate_alt: toNumber(row.engagement_rate_alt),
    average_views: toNumber(row.average_views),
    median_views: toNumber(row.median_views),
    average_likes: toNumber(row.average_likes),
    average_comments: toNumber(row.average_comments),
    median_likes: toNumber(row.median_likes),
    median_comments: toNumber(row.median_comments),
    is_verified: Boolean(row.is_verified),
    is_private: row.is_private == null ? null : Boolean(row.is_private),
    niches: Array.isArray(row.niches) ? row.niches : [],
  };
}

export function serializeMetric(row) {
  return {
    ...row,
    followers: toNumber(row.followers),
    engagement_rate: toNumber(row.engagement_rate),
    average_views: toNumber(row.average_views),
    median_views: toNumber(row.median_views),
    median_likes: toNumber(row.median_likes),
  };
}

export function serializePost(row) {
  return {
    ...row,
    likes: toNumber(row.likes),
    comments: toNumber(row.comments),
    views: toNumber(row.views),
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
  };
}

export function serializeStats(row) {
  return {
    influencer_count: toNumber(row.influencer_count) ?? 0,
    total_followers: toNumber(row.total_followers) ?? 0,
    avg_engagement: toNumber(row.avg_engagement),
    avg_views: toNumber(row.avg_views),
    median_views: toNumber(row.median_views),
  };
}
