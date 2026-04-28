import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const statusVariants = cva("inline-flex items-center gap-2", {
  variants: {
    status: {
      online: "text-success-600 dark:text-success-400",
      offline: "text-dark-400 dark:text-dark-500",
      warning: "text-warning-600 dark:text-warning-400",
      maintenance: "text-primary-600 dark:text-primary-400",
    },
  },
  defaultVariants: {
    status: "offline",
  },
});

const dotColorMap: Record<string, string> = {
  online: "bg-success-500",
  offline: "bg-dark-400 dark:bg-dark-500",
  warning: "bg-warning-500",
  maintenance: "bg-primary-500",
};

const pulseMap: Record<string, string> = {
  online: "animate-pulse",
  offline: "",
  warning: "animate-pulse",
  maintenance: "",
};

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusVariants> {
  label?: string;
  showDot?: boolean;
}

const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(
  (
    { className, status, label, showDot = true, ...props },
    ref
  ) => {
    const defaultLabel =
      (status ? status.charAt(0).toUpperCase() + status.slice(1) : null) ?? "Offline";

    return (
      <span
        ref={ref}
        className={cn(statusVariants({ status }), className)}
        role="status"
        aria-label={`Status: ${label || defaultLabel}`}
        {...props}
      >
        {showDot && (
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            {status === "online" && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  dotColorMap[status ?? "offline"]
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                dotColorMap[status ?? "offline"],
                pulseMap[status ?? "offline"]
              )}
            />
          </span>
        )}
        <span className="text-sm font-medium">{label || defaultLabel}</span>
      </span>
    );
  }
);

StatusIndicator.displayName = "StatusIndicator";

export { StatusIndicator, statusVariants };
