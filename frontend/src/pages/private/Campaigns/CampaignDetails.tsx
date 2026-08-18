import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricValue } from "@/components/ui/MetricValue";
import { getCampaign, updateCampaign } from "@/features/campaigns/campaign.api";
import { CampaignDetail } from "@/types";
import { formatDate, formatNumber, formatPercent, statusLabel } from "@/utils/format";
import { CampaignInfluencerTable } from "./components/CampaignInfluencerTable";

export default function CampaignDetails() {
  const { campaignId } = useParams();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId)
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [campaignId]);

  async function onStatus(status: string) {
    if (!campaignId) return;
    try {
      const result = await updateCampaign(campaignId, { status });
      setData(result);
      toast.success("Campaign updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (loading || !data) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const { campaign, influencers, stats } = data;
  const cards = [
    { label: "Influencers", value: formatNumber(stats.influencer_count) },
    { label: "Total followers", value: formatNumber(stats.total_followers) },
    { label: "Average engagement", value: formatPercent(stats.avg_engagement) },
    { label: "Average views", value: formatNumber(stats.avg_views) },
    { label: "Median views", value: formatNumber(stats.median_views) },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={campaign.name}
        description={campaign.description || "No description"}
        action={
          <Link to="/campaigns" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-neutral-100">
            All campaigns
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={campaign.status === "active" ? "success" : "secondary"}>{statusLabel(campaign.status)}</Badge>
        <span className="text-sm text-gray-500">Created {formatDate(campaign.created_at)}</span>
        <div className="ml-auto w-44">
          <Select value={campaign.status} onChange={(e) => onStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="text-sm text-gray-500 mb-2">{card.label}</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
              <MetricValue value={card.value} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        {influencers.length === 0 ? (
          <EmptyState title="No influencers in this campaign" />
        ) : (
          <CampaignInfluencerTable campaignId={campaign.id} influencers={influencers} />
        )}
      </div>
    </div>
  );
}
