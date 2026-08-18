import { DiscoveryStatus } from "@/types";
import { formatNumber } from "@/utils/format";

export function DiscoveryStatusPanel({ discovery }: { discovery?: DiscoveryStatus | null }) {
  if (!discovery) return null;
  const { candidates, catalogCount, targetQualified } = discovery;
  const items = [
    { label: "In catalog", value: catalogCount },
    { label: "Target", value: targetQualified },
    { label: "Queued / pending", value: candidates.pending + candidates.queued + candidates.processing },
    { label: "Qualified", value: candidates.qualified },
    { label: "Rejected", value: candidates.rejected },
    { label: "Blocked", value: candidates.blocked + candidates.failed },
  ];

  return (
    <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-1">Collection</h3>
      <p className="text-sm text-gray-500 mb-4">
        Seed CSV and graph hops feed the candidate queue. Search shows only qualified catalog rows.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-gray-50 dark:bg-neutral-950 px-3 py-3">
            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-neutral-100">{formatNumber(item.value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
