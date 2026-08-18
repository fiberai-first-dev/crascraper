import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SearchFiltersForm } from "./components/SearchFilters";
import { InfluencerTable } from "./components/InfluencerTable";
import { InfluencerProfileDrawer } from "./components/InfluencerProfileDrawer";
import { emptyFilters, getDashboard, searchInfluencers } from "@/features/influencers/influencer.api";
import { createCampaign } from "@/features/campaigns/campaign.api";
import { DashboardSummary, Influencer, SearchFilters } from "@/types";
import { DiscoveryStatusPanel } from "@/components/ui/DiscoveryStatus";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

function chipList(filters: SearchFilters) {
  const chips: { key: keyof SearchFilters; label: string }[] = [];
  if (filters.platform) chips.push({ key: "platform", label: `Platform: ${filters.platform}` });
  if (filters.location) chips.push({ key: "location", label: `Location: ${filters.location}` });
  if (filters.niche) chips.push({ key: "niche", label: `Niche: ${filters.niche}` });
  if (filters.minFollowers) chips.push({ key: "minFollowers", label: `Min followers: ${filters.minFollowers}` });
  if (filters.maxFollowers) chips.push({ key: "maxFollowers", label: `Max followers: ${filters.maxFollowers}` });
  if (filters.minEngagementRate) chips.push({ key: "minEngagementRate", label: `Min ER: ${filters.minEngagementRate}%` });
  if (filters.maxEngagementRate) chips.push({ key: "maxEngagementRate", label: `Max ER: ${filters.maxEngagementRate}%` });
  if (filters.minAverageViews) chips.push({ key: "minAverageViews", label: `Min avg views: ${filters.minAverageViews}` });
  if (filters.maxAverageViews) chips.push({ key: "maxAverageViews", label: `Max avg views: ${filters.maxAverageViews}` });
  if (filters.minMedianViews) chips.push({ key: "minMedianViews", label: `Min median views: ${filters.minMedianViews}` });
  if (filters.maxMedianViews) chips.push({ key: "maxMedianViews", label: `Max median views: ${filters.maxMedianViews}` });
  return chips;
}

export default function InfluencerSearch() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<SearchFilters>(emptyFilters());
  const [applied, setApplied] = useState<SearchFilters | null>(null);
  const [items, setItems] = useState<Influencer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [discovery, setDiscovery] = useState<DashboardSummary["discovery"]>();
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const chips = useMemo(() => (applied ? chipList(applied) : []), [applied]);

  useEffect(() => {
    void runSearch(emptyFilters());
    getDashboard()
      .then((summary) => setDiscovery(summary.discovery))
      .catch(() => {});
  }, []);

  async function runSearch(nextFilters: SearchFilters) {
    setLoading(true);
    try {
      const result = await searchInfluencers(nextFilters);
      setItems(result.items);
      setTotal(result.total);
      setApplied(nextFilters);
      setSearched(true);
      setRefreshing(new Set(result.queuedRefreshIds || []));
      setSelected(new Set());
      if (result.queuedRefreshIds?.length) {
        toast.message(`Queued refresh for ${result.queuedRefreshIds.length} stale profiles. Search again later for updates.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setCreating(true);
    try {
      const result = await createCampaign({
        name: name.trim(),
        description: description.trim(),
        influencerIds: [...selected],
      });
      toast.success("Campaign created");
      navigate(`/campaigns/${result.campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create campaign");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-28">
      <PageHeader
        title="Discover Influencers"
        description="Search qualified creators. Background collection does not update this page live — search again to see new rows."
      />

      <SearchFiltersForm filters={draft} onChange={setDraft} onSubmit={() => runSearch(draft)} loading={loading} />

      {discovery && items.length === 0 ? <DiscoveryStatusPanel discovery={discovery} /> : null}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300"
              onClick={() => {
                const next = { ...draft, [chip.key]: chip.key === "platform" ? "instagram" : "" };
                setDraft(next);
                runSearch(next);
              }}
            >
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5">
            <TableSkeleton />
          </div>
        ) : !searched ? (
          <EmptyState
            title="Search the catalog"
            description="Results come only from qualified creators in the database. An empty catalog is expected until collection succeeds."
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No creators found"
            description={
              discovery?.candidates.total
                ? `The catalog is empty until candidates qualify. ${discovery.candidates.pending + discovery.candidates.queued} still in queue, ${discovery.candidates.blocked} blocked, ${discovery.candidates.rejected} rejected.`
                : "No qualified rows match every filter. If the catalog is empty, the crawler has not stored any public profiles yet."
            }
          />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="font-semibold text-gray-900 dark:text-neutral-100 text-lg">{total} creators found</div>
                {chips.length > 0 && <div className="text-sm text-gray-500">Filters: {chips.length} active</div>}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 hidden sm:block">Sort:</label>
                <Select 
                  value={`${draft.sortBy}-${draft.sortOrder}`} 
                  onChange={(e) => {
                    const [by, order] = e.target.value.split("-");
                    const next = { ...draft, sortBy: by, sortOrder: order, page: 1 };
                    setDraft(next);
                    runSearch(next);
                  }}
                  className="py-1.5 px-3 h-auto text-sm w-44"
                >
                  <option value="followers-desc">Followers ↓</option>
                  <option value="followers-asc">Followers ↑</option>
                  <option value="engagement_rate-desc">Engagement ↓</option>
                  <option value="average_views-desc">Avg Views ↓</option>
                  <option value="median_views-desc">Median Views ↓</option>
                  <option value="updated_at-desc">Recently Updated</option>
                </Select>
              </div>
            </div>
            <InfluencerTable
              items={items}
              selected={selected}
              refreshing={refreshing}
              onToggle={toggle}
              onToggleAll={(checked) => setSelected(checked ? new Set(items.map((i) => i.id)) : new Set())}
              onRowClick={setDrawerId}
            />
            <div className="px-5 py-3 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>Rows per page:</span>
                <Select 
                  value={draft.limit} 
                  onChange={(e) => {
                    const next = { ...draft, limit: e.target.value, page: 1 };
                    setDraft(next);
                    runSearch(next);
                  }}
                  className="py-1 px-2 h-8 w-20 text-sm"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 mr-2">Page {draft.page}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-8 h-8 p-0 flex items-center justify-center"
                  disabled={draft.page <= 1 || loading}
                  onClick={() => {
                    const next = { ...draft, page: draft.page - 1 };
                    setDraft(next);
                    runSearch(next);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-8 h-8 p-0 flex items-center justify-center"
                  disabled={items.length < Number(draft.limit) || loading}
                  onClick={() => {
                    const next = { ...draft, page: draft.page + 1 };
                    setDraft(next);
                    runSearch(next);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 md:left-56 bg-white/95 dark:bg-neutral-950/95 border-t border-gray-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{selected.size} selected</div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
            className="text-gray-600 dark:text-neutral-400"
          >
            Clear
          </Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => setModalOpen(true)}
            className="bg-gray-900 dark:bg-neutral-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-neutral-900 shadow-sm"
          >
            Add to Campaign
          </Button>
        </div>
      </div>

      <InfluencerProfileDrawer 
        influencerId={drawerId}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
      />

      <Modal
        open={modalOpen}
        title="Create Campaign"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={creating}
              onClick={handleCreate}
              className="bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
            >
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Selected influencers: {selected.size}</p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Campaign name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike Fashion Campaign" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief for the campaign" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
