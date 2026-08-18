import { Analytics, Influencer, InfluencerPost } from "@/types";
import { formatNumber, formatPercent } from "@/utils/format";
import { MetricValue } from "@/components/ui/MetricValue";
import { NicheChips, initialsAvatar } from "@/components/ui/NicheChips";
import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function InfluencerHeader({ influencer }: { influencer: Influencer }) {
  return (
    <div className="flex items-start gap-4">
      {influencer.profile_image_url ? (
        <img src={influencer.profile_image_url} alt="" className="w-16 h-16 rounded-full object-cover bg-gray-100" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-800 text-sm font-semibold flex items-center justify-center text-gray-600">
          {initialsAvatar(influencer.username)}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">@{influencer.username}</h2>
          {influencer.is_verified && <BadgeCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          <Badge variant="secondary">{influencer.platform}</Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">{influencer.display_name || "Not available"}</p>
        {(influencer.category || influencer.account_type) && (
          <p className="text-xs text-gray-500 mt-1">
            {[influencer.category, influencer.account_type].filter(Boolean).join(" · ")}
          </p>
        )}
        {influencer.website_url && (
          <a
            href={influencer.website_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
          >
            {influencer.website_url.replace(/^https?:\/\//, "")}
          </a>
        )}
        <div className="mt-2">
          <NicheChips niches={influencer.niches} fallback={influencer.niche} />
        </div>
        <p className="text-sm text-gray-700 dark:text-neutral-300 mt-3 max-w-2xl">{influencer.bio || "Not available"}</p>
      </div>
    </div>
  );
}

export function InfluencerStats({ influencer }: { influencer: Influencer }) {
  const items = [
    { label: "Followers", value: formatNumber(influencer.followers) },
    { label: "Following", value: formatNumber(influencer.following) },
    { label: "Posts", value: formatNumber(influencer.post_count) },
    { label: "Engagement rate", value: formatPercent(influencer.engagement_rate) },
    { label: "Average Reel views", value: formatNumber(influencer.average_views) },
    { label: "Median Reel views", value: formatNumber(influencer.median_views) },
    { label: "Median likes", value: formatNumber(influencer.median_likes) },
    { label: "Location", value: influencer.location || "Not available" },
    { label: "Category", value: influencer.category || "Not available" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-gray-50 dark:bg-neutral-950 px-3 py-4">
          <div className="text-xs text-gray-500 mb-1">{item.label}</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
            <MetricValue value={item.value} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsGrid({ analytics }: { analytics: Analytics }) {
  const items = [
    { label: "Median likes", value: formatNumber(analytics.medianLikes) },
    { label: "Median comments", value: formatNumber(analytics.medianComments) },
    { label: "Average views", value: formatNumber(analytics.averageViews) },
    { label: "Median views", value: formatNumber(analytics.medianViews) },
    { label: "Engagement rate", value: formatPercent(analytics.engagementRate) },
    { label: "Follower growth", value: analytics.followerGrowth == null ? "Not available" : formatPercent(analytics.followerGrowth) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-100 dark:border-neutral-800 px-3 py-4">
          <div className="text-xs text-gray-500 mb-1">{item.label}</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
            <MetricValue value={item.value} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentPosts({ posts }: { posts: InfluencerPost[] }) {
  if (!posts.length) {
    return <p className="text-sm text-gray-400">Not available</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {posts.map((post) => (
        <a
          key={post.id}
          href={post.post_url || undefined}
          target="_blank"
          rel="noreferrer"
          className="border border-gray-100 dark:border-neutral-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-neutral-700"
        >
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary">{post.post_type || "post"}</Badge>
            <span className="text-xs text-gray-500">{post.published_at ? new Date(post.published_at).toLocaleDateString() : "Not available"}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-neutral-300 line-clamp-3">{post.caption || "Not available"}</p>
          {post.hashtags && post.hashtags.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
              {post.hashtags.slice(0, 8).map((tag) => `#${tag}`).join(" ")}
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
            <div>Likes <span className="block font-medium text-gray-900 dark:text-neutral-100">{formatNumber(post.likes)}</span></div>
            <div>Comments <span className="block font-medium text-gray-900 dark:text-neutral-100">{formatNumber(post.comments)}</span></div>
            <div>Views <span className="block font-medium text-gray-900 dark:text-neutral-100">{formatNumber(post.views)}</span></div>
          </div>
        </a>
      ))}
    </div>
  );
}
