import { parseOptionalNumber, parseOptionalString } from "../utils/parse.js";

export function searchBody(req) {
  return {
    platform: parseOptionalString(req.body?.platform)?.toLowerCase() || "instagram",
    location: parseOptionalString(req.body?.location),
    niche: parseOptionalString(req.body?.niche),
    search: parseOptionalString(req.body?.search),
    minFollowers: parseOptionalNumber(req.body?.minFollowers),
    maxFollowers: parseOptionalNumber(req.body?.maxFollowers),
    minEngagementRate: parseOptionalNumber(req.body?.minEngagementRate),
    maxEngagementRate: parseOptionalNumber(req.body?.maxEngagementRate),
    minAverageViews: parseOptionalNumber(req.body?.minAverageViews),
    maxAverageViews: parseOptionalNumber(req.body?.maxAverageViews),
    minMedianViews: parseOptionalNumber(req.body?.minMedianViews),
    maxMedianViews: parseOptionalNumber(req.body?.maxMedianViews),
    limit: Math.min(Math.max(parseOptionalNumber(req.body?.limit) || 100, 1), 100),
    page: Math.max(parseOptionalNumber(req.body?.page) || 1, 1),
    sortBy: parseOptionalString(req.body?.sortBy),
    sortOrder: parseOptionalString(req.body?.sortOrder)?.toLowerCase() === "asc" ? "asc" : "desc",
  };
}
