import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { CampaignInfluencer } from "@/types";
import { formatNumber, formatPercent, statusLabel } from "@/utils/format";
import { MetricValue } from "@/components/ui/MetricValue";
import { NicheChips, initialsAvatar } from "@/components/ui/NicheChips";
import { BadgeCheck } from "lucide-react";

export function CampaignInfluencerTable({
  campaignId,
  influencers,
}: {
  campaignId: string;
  influencers: CampaignInfluencer[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-neutral-800">
            <th className="px-4 py-3">Creator</th>
            <th className="px-4 py-3">Followers</th>
            <th className="px-4 py-3">Engagement</th>
            <th className="px-4 py-3">Avg views</th>
            <th className="px-4 py-3">Median views</th>
            <th className="px-4 py-3">Niches</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Campaign status</th>
          </tr>
        </thead>
        <tbody>
          {influencers.map((creator) => (
            <tr key={creator.id} className="border-b border-gray-50 dark:border-neutral-800/80 hover:bg-gray-50 dark:hover:bg-neutral-800/40">
              <td className="px-4 py-3">
                <Link to={`/campaigns/${campaignId}/influencers/${creator.id}`} className="flex items-center gap-3 min-w-[220px]">
                  {creator.profile_image_url ? (
                    <img src={creator.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-neutral-800 text-xs font-semibold flex items-center justify-center text-gray-600">
                      {initialsAvatar(creator.username)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-neutral-100 flex items-center gap-1.5">
                      @{creator.username}
                      {creator.is_verified && <BadgeCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="text-xs text-gray-500">{creator.display_name || "Not available"}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 font-medium"><MetricValue value={formatNumber(creator.followers)} /></td>
              <td className="px-4 py-3"><MetricValue value={formatPercent(creator.engagement_rate)} /></td>
              <td className="px-4 py-3"><MetricValue value={formatNumber(creator.average_views)} /></td>
              <td className="px-4 py-3"><MetricValue value={formatNumber(creator.median_views)} /></td>
              <td className="px-4 py-3"><NicheChips niches={creator.niches} fallback={creator.niche} /></td>
              <td className="px-4 py-3">{creator.location || "Not available"}</td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{statusLabel(creator.campaign_status)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
