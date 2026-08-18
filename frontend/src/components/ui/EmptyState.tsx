import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
