import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { getCampaignInfluencer, updateCampaignInfluencer } from "@/features/campaigns/campaign.api";
import { CAMPAIGN_INFLUENCER_STATUSES, CampaignInfluencerDetail } from "@/types";
import { formatDateTime, statusLabel } from "@/utils/format";
import { AnalyticsGrid, InfluencerHeader, InfluencerStats, RecentPosts } from "../Influencers/components/InfluencerStats";

export default function CampaignInfluencerDetails() {
  const { campaignId, influencerId } = useParams();
  const [data, setData] = useState<CampaignInfluencerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contentStatus, setContentStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaignId || !influencerId) return;
    getCampaignInfluencer(campaignId, influencerId)
      .then((result) => {
        setData(result);
        setNotes(result.campaignInfluencer.notes || "");
        setDeliverables(result.campaignInfluencer.deliverables || "");
        setContactStatus(result.campaignInfluencer.contact_status || "");
        setContentStatus(result.campaignInfluencer.content_status || "");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load influencer"))
      .finally(() => setLoading(false));
  }, [campaignId, influencerId]);

  async function save(extra?: { status?: string }) {
    if (!campaignId || !influencerId) return;
    setSaving(true);
    try {
      const result = await updateCampaignInfluencer(campaignId, influencerId, {
        notes,
        deliverables,
        contactStatus: contactStatus || undefined,
        contentStatus: contentStatus || undefined,
        ...extra,
      });
      setData((prev) => (prev ? { ...prev, campaignInfluencer: result.campaignInfluencer } : prev));
      toast.success("Campaign details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const ci = data.campaignInfluencer;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={data.campaign.name}
        description="Creator profile and campaign-specific tracking"
        action={
          <Link to={`/campaigns/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-neutral-100">
            Back to campaign
          </Link>
        }
      />

      <Card>
        <CardContent className="p-6 space-y-6">
          <InfluencerHeader influencer={data.influencer} />
          <InfluencerStats influencer={data.influencer} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Campaign status</label>
              <Select value={ci.campaign_status} onChange={(e) => save({ status: e.target.value })}>
                {CAMPAIGN_INFLUENCER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Contact status</label>
              <Input value={contactStatus} onChange={(e) => setContactStatus(e.target.value)} placeholder="Emailed, waiting" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Content status</label>
              <Input value={contentStatus} onChange={(e) => setContentStatus(e.target.value)} placeholder="Brief sent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Selected date</label>
              <div className="text-sm text-gray-700 dark:text-neutral-300 px-1 py-2">{formatDateTime(ci.selected_at)}</div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Deliverables</label>
            <Textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} placeholder="2 Reels, 1 story" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" />
          </div>
          <div className="text-xs text-gray-500">Last updated {formatDateTime(ci.campaign_updated_at)}</div>
          <div className="flex justify-end">
            <Button
              disabled={saving}
              onClick={() => save()}
              className="bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
            >
              {saving ? "Saving..." : "Save campaign details"}
            </Button>
          </div>
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
