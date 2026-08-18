import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, ExternalLink, BadgeCheck, Loader2 } from "lucide-react";
import { InfluencerDetail } from "@/types";
import { getInfluencer } from "@/features/influencers/influencer.api";
import { MetricValue } from "@/components/ui/MetricValue";
import { formatNumber, formatPercent } from "@/utils/format";
import { NicheChips, initialsAvatar } from "@/components/ui/NicheChips";
import { Button } from "@/components/ui/Button";

export function InfluencerProfileDrawer({
  influencerId,
  open,
  onClose,
}: {
  influencerId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<InfluencerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && influencerId) {
      setLoading(true);
      setError("");
      getInfluencer(influencerId)
        .then((detail) => setData(detail))
        .catch((err) => setError(err.message || "Failed to load profile"))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [open, influencerId]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-neutral-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-neutral-800 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            Creator Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          {error && (
            <div className="p-6 text-center text-red-500">
              {error}
            </div>
          )}
          {!loading && !error && data && (
            <div className="p-6 space-y-8">
              {/* Header */}
              <div className="flex gap-5">
                {data.influencer.profile_image_url ? (
                  <img
                    src={data.influencer.profile_image_url}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border border-gray-200 dark:border-neutral-700 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-neutral-800 text-xl font-bold flex items-center justify-center text-gray-600 border border-gray-200 dark:border-neutral-700">
                    {initialsAvatar(data.influencer.username)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-neutral-100">
                      {data.influencer.display_name || `@${data.influencer.username}`}
                    </h3>
                    {data.influencer.is_verified && (
                      <BadgeCheck className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <a
                    href={data.influencer.profile_url || `https://instagram.com/${data.influencer.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium mb-3"
                  >
                    @{data.influencer.username}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-sm text-gray-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {data.influencer.bio || "No bio available."}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800">
                  <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">Followers</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-neutral-100">
                    <MetricValue value={formatNumber(data.influencer.followers)} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800">
                  <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">Following</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-neutral-100">
                    <MetricValue value={formatNumber(data.influencer.following)} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800">
                  <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">Posts</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-neutral-100">
                    <MetricValue value={formatNumber(data.influencer.post_count)} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800">
                  <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">Engagement</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-neutral-100">
                    <MetricValue value={formatPercent(data.analytics.engagementRate || data.influencer.engagement_rate)} />
                  </div>
                </div>
              </div>

              {/* Niches & Location */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-2">Categories & Niches</h4>
                  <NicheChips niches={data.influencer.niches} fallback={data.influencer.niche} />
                </div>
                {data.influencer.location && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-1">Location</h4>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">{data.influencer.location}</p>
                  </div>
                )}
                {(data.influencer.category || data.influencer.account_type) && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-1">Profile</h4>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      {[data.influencer.category, data.influencer.account_type, data.influencer.platform]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                )}
                {data.influencer.website_url && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-1">Website</h4>
                    <a
                      href={data.influencer.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {data.influencer.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>

              {/* Recent Posts */}
              {data.posts && data.posts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3 flex items-center justify-between">
                    Recent Posts
                    <span className="text-xs font-normal text-gray-500">{data.posts.length} collected</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.posts.slice(0, 6).map((post) => (
                      <a
                        key={post.id}
                        href={post.post_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-square bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700 block"
                      >
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
                        <div className="absolute bottom-1 right-1 left-1 flex justify-between text-[10px] font-bold text-white z-20 drop-shadow-md">
                          <span className="bg-black/40 px-1 py-0.5 rounded backdrop-blur-sm">♥ {formatNumber(post.likes)}</span>
                          {(post.views || 0) > 0 && (
                            <span className="bg-black/40 px-1 py-0.5 rounded backdrop-blur-sm">▶ {formatNumber(post.views)}</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
          <Button asChild className="w-full bg-gray-900 dark:bg-neutral-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-neutral-900">
            <Link to={`/influencers/${influencerId}`}>View Full Profile</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
