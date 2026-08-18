import { useState } from "react";
import { SearchFilters } from "@/types";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

export function SearchFiltersForm({
  filters,
  onChange,
  onSubmit,
  loading,
}: {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function set<K extends keyof SearchFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            className="pl-10 h-11 text-base shadow-sm"
            placeholder="Search by @handle or creator name..."
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Platform</label>
              <Select value={filters.platform} onChange={(e) => set("platform", e.target.value)}>
                <option value="instagram">Instagram</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Location</label>
              <Input value={filters.location} onChange={(e) => set("location", e.target.value)} placeholder="India" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Niche</label>
              <Input value={filters.niche} onChange={(e) => set("niche", e.target.value)} placeholder="Fashion" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Min Followers</label>
              <Input type="number" value={filters.minFollowers} onChange={(e) => set("minFollowers", e.target.value)} placeholder="10000" />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-gray-900 dark:bg-neutral-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-neutral-900 px-8"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-neutral-800/60 pt-3 -mx-2 px-2 mt-4 flex justify-between items-center">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 transition-colors"
          >
            {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Filters
          </button>
        </div>

        {advancedOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Maximum followers</label>
              <Input type="number" value={filters.maxFollowers} onChange={(e) => set("maxFollowers", e.target.value)} placeholder="20000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Min engagement rate (%)</label>
              <Input type="number" step="0.1" value={filters.minEngagementRate} onChange={(e) => set("minEngagementRate", e.target.value)} placeholder="3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Max engagement rate (%)</label>
              <Input type="number" step="0.1" value={filters.maxEngagementRate} onChange={(e) => set("maxEngagementRate", e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Min avg views</label>
              <Input type="number" value={filters.minAverageViews} onChange={(e) => set("minAverageViews", e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Max avg views</label>
              <Input type="number" value={filters.maxAverageViews} onChange={(e) => set("maxAverageViews", e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Min median views</label>
              <Input type="number" value={filters.minMedianViews} onChange={(e) => set("minMedianViews", e.target.value)} placeholder="3000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Max median views</label>
              <Input type="number" value={filters.maxMedianViews} onChange={(e) => set("maxMedianViews", e.target.value)} placeholder="40000" />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
