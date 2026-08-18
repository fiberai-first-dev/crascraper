import { Route, Routes } from "react-router-dom";
import PublicLayout from "@/pages/public/PublicLayout";
import LoginPage from "@/pages/public/LoginPage";
import NotFound from "@/pages/public/NotFound";
import PrivateLayout from "@/pages/private/PrivateLayout";
import DashboardPage from "@/pages/private/DashboardPage";
import SettingsPage from "@/pages/private/Settings/Settings";
import InfluencerSearch from "@/pages/private/Influencers/InfluencerSearch";
import InfluencerDetails from "@/pages/private/Influencers/InfluencerDetails";
import CampaignsPage from "@/pages/private/Campaigns/Campaigns";
import CampaignDetails from "@/pages/private/Campaigns/CampaignDetails";
import CampaignInfluencerDetails from "@/pages/private/Campaigns/CampaignInfluencerDetails";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LoginPage />} />
      </Route>

      <Route element={<PrivateLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/influencers" element={<InfluencerSearch />} />
        <Route path="/influencers/:id" element={<InfluencerDetails />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:campaignId" element={<CampaignDetails />} />
        <Route path="/campaigns/:campaignId/influencers/:influencerId" element={<CampaignInfluencerDetails />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
