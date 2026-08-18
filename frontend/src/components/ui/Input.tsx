import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-2 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 border border-gray-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-neutral-500 focus:border-transparent transition-all disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-4 py-2 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 border border-gray-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-neutral-500 focus:border-transparent transition-all disabled:opacity-50 min-h-[96px]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-neutral-500",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";
