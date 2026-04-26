import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
        secondary:
          "bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800",
        outline:
          "border border-dark-300 bg-transparent text-dark-700 hover:bg-dark-50 active:bg-dark-100 dark:border-dark-600 dark:text-dark-200 dark:hover:bg-dark-800",
        ghost:
          "bg-transparent text-dark-700 hover:bg-dark-100 active:bg-dark-200 dark:text-dark-300 dark:hover:bg-dark-800",
        danger:
          "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon &&
          React.cloneElement(leftIcon, {
            className: cn("h-4 w-4", leftIcon.props.className),
            "aria-hidden": "true",
          })
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
