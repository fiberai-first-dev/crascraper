import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { listCampaigns } from "@/features/campaigns/campaign.api";
import { Campaign } from "@/types";
import { CampaignCard } from "./components/CampaignCard";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCampaigns()
      .then((res) => setCampaigns(res.campaigns))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Campaigns"
        description="Campaigns belonging to your agency account"
        action={
          <Link to="/influencers">
            <Button className="bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900">Discover influencers</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl">
          <EmptyState
            title="No campaigns yet"
            description="Select creators from Discover Influencers and create a campaign."
            action={
              <Link to="/influencers">
                <Button variant="outline">Go to discovery</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
