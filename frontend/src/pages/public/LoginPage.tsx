import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login } from "@/features/auth/auth.api";
import { getToken } from "@/features/auth/auth.utils";

const DEMO_EMAIL = "agency@fiberai.com";
const DEMO_PASSWORD = "password123";

export default function LoginPage() {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 px-4 transition-colors">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-900 dark:bg-neutral-100 mb-5 shadow-lg">
            <svg
              className="w-6 h-6 text-white dark:text-neutral-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1.5">
            Sign in to your account to continue
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 px-8 py-8 shadow-sm border border-gray-200 dark:border-neutral-800 rounded-2xl transition-colors">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2.5 rounded-lg border border-red-100 dark:border-red-900/50 flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gray-900 dark:bg-neutral-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-neutral-900 transition-colors font-medium"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-neutral-600 mt-8">
          © {new Date().getFullYear()} FiberAI. All rights reserved.
        </p>
      </div>
    </div>
  );
}
