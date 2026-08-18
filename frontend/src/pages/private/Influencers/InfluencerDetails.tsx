import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { getInfluencer } from "@/features/influencers/influencer.api";
import { InfluencerDetail } from "@/types";
import { formatDateTime } from "@/utils/format";
import { AnalyticsGrid, InfluencerHeader, InfluencerStats, RecentPosts } from "./components/InfluencerStats";

export default function InfluencerDetails() {
  const { id } = useParams();
  const [data, setData] = useState<InfluencerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getInfluencer(id)
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load creator"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { influencer } = data;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Creator profile"
        description={`Last updated ${formatDateTime(influencer.last_scraped_at)}`}
        action={
          <Link to="/influencers" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-neutral-100">
            Back to search
          </Link>
        }
      />

      <Card>
        <CardContent className="p-6 space-y-6">
          <InfluencerHeader influencer={influencer} />
          <InfluencerStats influencer={influencer} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthChart metrics={data.metrics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsGrid analytics={data.analytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent content</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentPosts posts={data.posts} />
        </CardContent>
      </Card>
    </div>
  );
}
