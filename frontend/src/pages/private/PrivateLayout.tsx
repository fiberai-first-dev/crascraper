import { useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppProvider from "@/context/AppProvider";
import Sidebar from "@/components/Sidebar";
import { AppContext } from "@/context/AppContext";
import { getToken } from "@/features/auth/auth.utils";
import { fetchMe } from "@/features/auth/auth.api";

export default function PrivateLayout() {
  return (
    <AppProvider>
      <InnerLayout />
    </AppProvider>
  );
}

function InnerLayout() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const token = getToken();
      if (!token) {
        navigate("/", { replace: true });
        return;
      }
      try {
        const user = await fetchMe();
        if (!cancelled) ctx?.setUser(user);
      } catch {
        ctx?.logout();
        navigate("/", { replace: true });
        return;
      }
      if (!cancelled) setReady(true);
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 dark:text-neutral-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen min-h-0 overflow-hidden">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
