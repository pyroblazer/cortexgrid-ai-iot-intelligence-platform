import React, { forwardRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "../lib/utils";

const alertVariants = cva(
  "relative flex items-start gap-3 rounded-lg border p-4",
  {
    variants: {
      variant: {
        success:
          "border-success-200 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-950/30 dark:text-success-300",
        error:
          "border-danger-200 bg-danger-50 text-danger-800 dark:border-danger-800 dark:bg-danger-950/30 dark:text-danger-300",
        warning:
          "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-800 dark:bg-warning-950/30 dark:text-warning-300",
        info: "border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconMap: Record<string, React.ReactElement> = {
  success: <CheckCircle className="h-5 w-5 shrink-0" />,
  error: <XCircle className="h-5 w-5 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0" />,
  info: <Info className="h-5 w-5 shrink-0" />,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant,
      title,
      dismissible = false,
      onDismiss,
      children,
      ...props
    },
    ref
  ) => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const handleDismiss = () => {
      setDismissed(true);
      onDismiss?.();
    };

    return (
      <div
        ref={ref}
        className={cn(alertVariants({ variant }), className)}
        role="alert"
        {...props}
      >
        <span aria-hidden="true">{iconMap[variant ?? "info"]}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="mb-1 font-semibold leading-none">{title}</h5>
          )}
          {children && (
            <div className="text-sm opacity-90">{children}</div>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert, alertVariants };
