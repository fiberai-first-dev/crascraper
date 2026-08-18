import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { getDashboard } from "@/features/influencers/influencer.api";
import { DashboardSummary } from "@/types";
import { formatNumber, formatPercent, formatDate, statusLabel } from "@/utils/format";
import { MetricValue } from "@/components/ui/MetricValue";
import { DiscoveryStatusPanel } from "@/components/ui/DiscoveryStatus";
import { Megaphone, Search, Users, BarChart3, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader title="Dashboard" description="Creator catalog and campaign overview" />

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-md border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { label: "Creators in catalog", value: formatNumber(data.influencerCount), icon: Users, href: "/influencers" },
              { label: "Campaigns", value: formatNumber(data.campaignCount), icon: Megaphone, href: "/campaigns" },
              { label: "Catalog followers", value: formatNumber(data.totalFollowers), icon: Search, href: "/influencers" },
              { label: "Avg engagement", value: formatPercent(data.avgEngagement), icon: BarChart3, href: "/influencers" },
              { label: "Median views", value: formatNumber(data.medianViews), icon: Eye, href: "/influencers" },
            ].map((card) => (
              <Link
                key={card.label}
                to={card.href}
                className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-neutral-400">{card.label}</span>
                  <card.icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">
                  <MetricValue value={card.value} />
                </div>
              </Link>
            ))}
          </div>

          <DiscoveryStatusPanel discovery={data.discovery} />

          <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-neutral-100">Recent campaigns</h3>
              <Link to="/campaigns" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-neutral-100">
                View all
              </Link>
            </div>
            {data.recentCampaigns.length === 0 ? (
              <p className="text-sm text-gray-500">No campaigns yet. Search the catalog after creators qualify.</p>
            ) : (
              data.recentCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-neutral-800 pt-3"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-neutral-100">{campaign.name}</div>
                    <div className="text-xs text-gray-500">
                      {campaign.influencer_count || 0} influencers · {formatDate(campaign.created_at)}
                    </div>
                  </div>
                  <Badge variant="secondary">{statusLabel(campaign.status)}</Badge>
                </Link>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
