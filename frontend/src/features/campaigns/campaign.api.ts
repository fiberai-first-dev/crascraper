import { api } from "@/services/api";
import { Campaign, CampaignDetail, CampaignInfluencerDetail } from "@/types";

export function listCampaigns() {
  return api<{ campaigns: Campaign[] }>("/api/campaigns");
}

export function createCampaign(payload: { name: string; description: string; influencerIds: string[] }) {
  return api<CampaignDetail>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCampaign(id: string) {
  return api<CampaignDetail>(`/api/campaigns/${id}`);
}

export function updateCampaign(id: string, payload: { name?: string; description?: string; status?: string }) {
  return api<CampaignDetail>(`/api/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getCampaignInfluencer(campaignId: string, influencerId: string) {
  return api<CampaignInfluencerDetail>(`/api/campaigns/${campaignId}/influencers/${influencerId}`);
}

export function updateCampaignInfluencer(
  campaignId: string,
  influencerId: string,
  payload: {
    status?: string;
    notes?: string;
    deliverables?: string;
    contactStatus?: string;
    contentStatus?: string;
  }
) {
  return api<{ campaignInfluencer: CampaignInfluencerDetail["campaignInfluencer"] }>(
    `/api/campaigns/${campaignId}/influencers/${influencerId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}
