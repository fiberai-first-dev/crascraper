import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Campaign } from "@/types";
import { formatDate, statusLabel } from "@/utils/format";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-neutral-700 transition-colors block"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 dark:text-neutral-100">{campaign.name}</h3>
        <Badge variant={campaign.status === "active" ? "success" : "secondary"}>{statusLabel(campaign.status)}</Badge>
      </div>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 line-clamp-2">
        {campaign.description || "No description"}
      </p>
      <div className="mt-4 text-sm text-gray-600 dark:text-neutral-400">
        {campaign.influencer_count || 0} Influencers
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Created {formatDate(campaign.created_at)} · Updated {formatDate(campaign.updated_at)}
      </div>
    </Link>
  );
}
