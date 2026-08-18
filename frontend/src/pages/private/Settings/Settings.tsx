import { useContext } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppContext } from "@/context/AppContext";

export default function SettingsPage() {
  const ctx = useContext(AppContext);
  const user = ctx?.state.user;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader title="Settings" description="Manage your account preferences" />

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Account</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-1">Name</div>
            <div className="font-medium text-gray-900 dark:text-neutral-100">{user?.name || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Email</div>
            <div className="font-medium text-gray-900 dark:text-neutral-100">{user?.email || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
