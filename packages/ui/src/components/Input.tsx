import React, { forwardRef, useId } from "react";
import { cn } from "../lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: React.ReactElement;
  suffixIcon?: React.ReactElement;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      prefixIcon,
      suffixIcon,
      disabled,
      id,
      type = "text",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {prefixIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {React.cloneElement(prefixIcon, {
                className: cn(
                  "h-4 w-4 text-dark-400",
                  prefixIcon.props.className
                ),
                "aria-hidden": "true",
              })}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400",
              "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
              "disabled:cursor-not-allowed disabled:bg-dark-50 disabled:opacity-50",
              "dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 dark:placeholder:text-dark-500",
              error &&
                "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20",
              prefixIcon && "pl-10",
              suffixIcon && "pr-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            {...props}
          />
          {suffixIcon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {React.cloneElement(suffixIcon, {
                className: cn(
                  "h-4 w-4 text-dark-400",
                  suffixIcon.props.className
                ),
                "aria-hidden": "true",
              })}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-danger-600 dark:text-danger-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-1.5 text-sm text-dark-500 dark:text-dark-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
