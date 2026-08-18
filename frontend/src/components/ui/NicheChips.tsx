import { Badge } from "@/components/ui/Badge";
import { NicheTag } from "@/types";

export function NicheChips({
  niches,
  fallback,
}: {
  niches?: NicheTag[] | null;
  fallback?: string | null;
}) {
  const labels = (niches || []).map((n) => n.niche).filter(Boolean);
  if (!labels.length && fallback) labels.push(fallback);
  if (!labels.length) {
    return <span className="text-gray-400 dark:text-neutral-500">Not available</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge key={label} variant="secondary" className="normal-case font-medium">
          {label}
        </Badge>
      ))}
    </div>
  );
}

export function initialsAvatar(name: string) {
  const text = name.replace(/^@/, "").slice(0, 2).toUpperCase();
  return text || "?";
}
