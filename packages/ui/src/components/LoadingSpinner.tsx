import React, { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  overlay?: boolean;
}

const sizeMap: Record<string, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
  xl: "h-16 w-16 border-4",
};

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", text, overlay = false, ...props }, ref) => {
    const spinner = (
      <div
        ref={ref}
        className={cn(
          "inline-flex flex-col items-center justify-center gap-3",
          overlay && "fixed inset-0 z-50 flex h-full w-full bg-black/40 dark:bg-black/60",
          className
        )}
        role="status"
        aria-label={text || "Loading"}
        {...props}
      >
        <div
          className={cn(
            "animate-spin rounded-full border-dark-200 border-t-primary-600 dark:border-dark-700 dark:border-t-primary-400",
            sizeMap[size]
          )}
          aria-hidden="true"
        />
        {text && (
          <p className="text-sm font-medium text-dark-600 dark:text-dark-400">
            {text}
          </p>
        )}
      </div>
    );

    return spinner;
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };
