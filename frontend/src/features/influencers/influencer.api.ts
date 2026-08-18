import { api } from "@/services/api";
import { DashboardSummary, InfluencerDetail, SearchFilters, SearchResponse } from "@/types";

export function emptyFilters(): SearchFilters {
  return {
    platform: "instagram",
    location: "",
    niche: "",
    search: "",
    minFollowers: "",
    maxFollowers: "",
    minEngagementRate: "",
    maxEngagementRate: "",
    minAverageViews: "",
    maxAverageViews: "",
    minMedianViews: "",
    maxMedianViews: "",
    limit: "50",
    page: 1,
    sortBy: "followers",
    sortOrder: "desc",
  };
}

export async function searchInfluencers(filters: SearchFilters) {
  const payload: Record<string, unknown> = {
    platform: filters.platform || "instagram",
    limit: Number(filters.limit || 50),
    page: filters.page || 1,
    sortBy: filters.sortBy || "followers",
    sortOrder: filters.sortOrder || "desc",
  };
  if (filters.search) payload.search = filters.search;
  if (filters.location) payload.location = filters.location;
  if (filters.niche) payload.niche = filters.niche;
  if (filters.minFollowers) payload.minFollowers = Number(filters.minFollowers);
  if (filters.maxFollowers) payload.maxFollowers = Number(filters.maxFollowers);
  if (filters.minEngagementRate) payload.minEngagementRate = Number(filters.minEngagementRate);
  if (filters.maxEngagementRate) payload.maxEngagementRate = Number(filters.maxEngagementRate);
  if (filters.minAverageViews) payload.minAverageViews = Number(filters.minAverageViews);
  if (filters.maxAverageViews) payload.maxAverageViews = Number(filters.maxAverageViews);
  if (filters.minMedianViews) payload.minMedianViews = Number(filters.minMedianViews);
  if (filters.maxMedianViews) payload.maxMedianViews = Number(filters.maxMedianViews);

  return api<SearchResponse>("/api/influencers/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getInfluencer(id: string) {
  return api<InfluencerDetail>(`/api/influencers/${id}`);
}

export function getDashboard() {
  return api<DashboardSummary>("/api/dashboard");
}
