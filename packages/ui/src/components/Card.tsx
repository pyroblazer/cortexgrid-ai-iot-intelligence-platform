import React, { forwardRef } from "react";
import { cn } from "../lib/utils";

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-dark-200 bg-white shadow-card",
        "dark:border-dark-700 dark:bg-dark-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";

/* -------------------------------------------------------------------------- */
/*  CardHeader                                                                */
/* -------------------------------------------------------------------------- */

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);

CardHeader.displayName = "CardHeader";

/* -------------------------------------------------------------------------- */
/*  CardTitle                                                                 */
/* -------------------------------------------------------------------------- */

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-dark-900 dark:text-dark-50",
        className
      )}
      {...props}
    />
  )
);

CardTitle.displayName = "CardTitle";

/* -------------------------------------------------------------------------- */
/*  CardDescription                                                           */
/* -------------------------------------------------------------------------- */

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-dark-500 dark:text-dark-400", className)}
      {...props}
    />
  )
);

CardDescription.displayName = "CardDescription";

/* -------------------------------------------------------------------------- */
/*  CardContent                                                               */
/* -------------------------------------------------------------------------- */

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);

CardContent.displayName = "CardContent";

/* -------------------------------------------------------------------------- */
/*  CardFooter                                                                */
/* -------------------------------------------------------------------------- */

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);

CardFooter.displayName = "CardFooter";

/* -------------------------------------------------------------------------- */
/*  Exports                                                                   */
/* -------------------------------------------------------------------------- */

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
