import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">Page not found</h1>
        <p className="text-sm text-gray-500">The page you requested does not exist.</p>
        <Link to="/dashboard">
          <Button className="bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
