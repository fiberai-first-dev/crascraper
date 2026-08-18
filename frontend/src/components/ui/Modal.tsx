import { X } from "lucide-react";
import { ReactNode } from "react";

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white dark:bg-neutral-950">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
