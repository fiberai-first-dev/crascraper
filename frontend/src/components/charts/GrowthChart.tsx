import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InfluencerMetric } from "@/types";
import { formatDate, formatNumber } from "@/utils/format";

export function GrowthChart({ metrics }: { metrics: InfluencerMetric[] }) {
  if (!metrics.length) {
    return <p className="text-sm text-gray-400 dark:text-neutral-500">Not available</p>;
  }

  const data = metrics.map((m) => ({
    date: formatDate(m.recorded_at),
    followers: m.followers,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatNumber(v)}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatNumber(Number(value))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Line type="monotone" dataKey="followers" stroke="#111827" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
