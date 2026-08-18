export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not available";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Not available";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not available";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Not available";
  return `${n.toFixed(1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not available";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not available";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusLabel(value: string | null | undefined): string {
  if (!value) return "Not available";
  return value.replace(/_/g, " ");
}

export function metric(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}
