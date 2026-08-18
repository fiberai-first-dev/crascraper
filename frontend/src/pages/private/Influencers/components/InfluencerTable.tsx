import { Badge } from "@/components/ui/Badge";
import { Influencer } from "@/types";
import { formatNumber, formatPercent } from "@/utils/format";
import { MetricValue } from "@/components/ui/MetricValue";
import { NicheChips, initialsAvatar } from "@/components/ui/NicheChips";
import { BadgeCheck, Check } from "lucide-react";

export function InfluencerTable({
  items,
  selected,
  refreshing,
  onToggle,
  onToggleAll,
  onRowClick,
}: {
  items: Influencer[];
  selected: Set<string>;
  refreshing: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onRowClick: (id: string) => void;
}) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function timeAgo(dateString: string | null) {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      const diffMs = Date.now() - d.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor(diffMs / 60000);
      
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      if (diffDays > 0) return rtf.format(-diffDays, 'day');
      if (diffHours > 0) return rtf.format(-diffHours, 'hour');
      if (diffMins > 0) return rtf.format(-diffMins, 'minute');
      return "just now";
    } catch {
      return "—";
    }
  }

  function renderDataAvailability(creator: Influencer) {
    const hasFollowers = creator.followers != null;
    const hasEngagement = creator.engagement_rate != null;
    const hasViews = creator.average_views != null || creator.median_views != null;

    if (hasFollowers && hasEngagement && hasViews) {
       return <div className="text-xs text-gray-500">{creator.display_name || "—"}</div>;
    }

    return (
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-medium text-gray-400 mt-0.5">
        <span className="flex items-center gap-0.5">Followers {hasFollowers ? <Check className="w-3 h-3 text-green-500" /> : "—"}</span>
        <span className="flex items-center gap-0.5">Engagement {hasEngagement ? <Check className="w-3 h-3 text-green-500" /> : "—"}</span>
        <span className="flex items-center gap-0.5">Views {hasViews ? <Check className="w-3 h-3 text-green-500" /> : "—"}</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked)} />
            </th>
            <th className="px-4 py-3">Creator</th>
            <th className="px-4 py-3">Followers</th>
            <th className="px-4 py-3">Engagement</th>
            <th className="px-4 py-3">Avg views</th>
            <th className="px-4 py-3">Median views</th>
            <th className="px-4 py-3">Niches</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((creator) => (
            <tr
              key={creator.id}
              onClick={() => onRowClick(creator.id)}
              className="border-b border-gray-50 dark:border-neutral-800/80 hover:bg-gray-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(creator.id)} onChange={() => onToggle(creator.id)} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-[220px]">
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
                      {refreshing.has(creator.id) && (
                        <Badge variant="info" className="normal-case">Refresh queued</Badge>
                      )}
                    </div>
                    {renderDataAvailability(creator)}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-neutral-100">
                <MetricValue value={formatNumber(creator.followers)} />
              </td>
              <td className="px-4 py-3">
                <MetricValue value={formatPercent(creator.engagement_rate)} />
              </td>
              <td className="px-4 py-3">
                <MetricValue value={formatNumber(creator.average_views)} />
              </td>
              <td className="px-4 py-3">
                <MetricValue value={formatNumber(creator.median_views)} />
              </td>
              <td className="px-4 py-3">
                <NicheChips niches={creator.niches} fallback={creator.niche} />
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-neutral-400">{creator.location || "—"}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                {timeAgo(creator.last_scraped_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
