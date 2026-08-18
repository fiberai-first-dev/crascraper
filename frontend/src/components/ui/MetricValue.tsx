export function MetricValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "" || value === "Not available") {
    return <span className="text-gray-400 dark:text-neutral-500">—</span>;
  }
  return <span>{value}</span>;
}
