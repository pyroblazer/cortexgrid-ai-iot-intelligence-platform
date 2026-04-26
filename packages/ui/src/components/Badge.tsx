import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-dark-100 text-dark-700 dark:bg-dark-700 dark:text-dark-300",
        success:
          "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
        warning:
          "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
        danger:
          "bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400",
        info: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const dotColorMap: Record<string, string> = {
  default: "bg-dark-400",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-primary-500",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColorMap[variant ?? "default"])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
