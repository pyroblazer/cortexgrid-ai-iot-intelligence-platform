/**
 * KPI Card Component (components/dashboard/kpi-card.tsx)
 *
 * WHAT: A reusable card that displays a single Key Performance Indicator (KPI).
 *       Shows a title, a big number, a trend arrow with percentage, and a colored icon.
 *
 * WHY IT EXISTS: The dashboard has 4 metric cards at the top (Total Devices, Active Devices,
 *               Active Alerts, Data Points). Instead of repeating the same layout code 4 times,
 *               this component encapsulates the design so each card just passes different props.
 *
 * Visual layout of a KPI card:
 *   +-------------------------------------------+
 *   |  Total Devices              [icon in box] |
 *   |  52                                       |
 *   |  ^ 12.5% vs last month                    |
 *   +-------------------------------------------+
 *
 * The "change" value controls the trend indicator:
 *   - Positive number (e.g., +12.5): green arrow up (good for devices, bad for alerts)
 *   - Negative number (e.g., -15.3): red arrow down
 *
 * Color system:
 *   Each card has a "color" prop that determines the icon background color.
 *   - primary (blue): general metrics like total devices
 *   - success (green): positive metrics like active devices
 *   - danger (red): warning metrics like active alerts
 *   - warning (yellow): caution metrics
 *   - accent (purple): informational metrics like data points
 */

import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@cortexgrid/ui";
import { Card, CardContent } from "@cortexgrid/ui/components/Card";

/** Props that configure what the KPI card displays */
interface KpiCardProps {
  title: string;          // Label above the number (e.g., "Total Devices")
  value: number;          // The main number to display (e.g., 52)
  change?: number;        // Optional percentage change (e.g., 12.5 means +12.5%)
  changeLabel?: string;   // Context for the change (e.g., "vs last month")
  icon: React.ReactElement; // The icon to show in the colored box
  color?: "primary" | "success" | "danger" | "warning" | "accent"; // Icon color scheme
}

// Maps color names to Tailwind CSS classes for the icon background and icon color.
// Each color has light mode and dark mode variants.
const colorMap: Record<string, { bg: string; icon: string }> = {
  primary: {
    bg: "bg-primary-50 dark:bg-primary-900/20",
    icon: "text-primary-600 dark:text-primary-400",
  },
  success: {
    bg: "bg-success-50 dark:bg-success-900/20",
    icon: "text-success-600 dark:text-success-400",
  },
  danger: {
    bg: "bg-danger-50 dark:bg-danger-900/20",
    icon: "text-danger-600 dark:text-danger-400",
  },
  warning: {
    bg: "bg-warning-50 dark:bg-warning-900/20",
    icon: "text-warning-600 dark:text-warning-400",
  },
  accent: {
    bg: "bg-accent-50 dark:bg-accent-900/20",
    icon: "text-accent-600 dark:text-accent-400",
  },
};

/**
 * formatValue - Converts large numbers into compact display format.
 *
 * Examples:
 *   128473 -> "128.5K"
 *   1500000 -> "1.5M"
 *   52 -> "52"
 *
 * This makes the KPI cards easier to scan at a glance --
 * "128.5K" is faster to read than "128,473".
 */
function formatValue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  // For small numbers, use locale-aware formatting (adds commas in some locales)
  return value.toLocaleString();
}

/**
 * KpiCard - Displays a single metric with trend information.
 *
 * @param title - The metric label (e.g., "Total Devices")
 * @param value - The current value (e.g., 52)
 * @param change - Percentage change from previous period (positive = up, negative = down)
 * @param changeLabel - Context text (e.g., "vs last month")
 * @param icon - The Lucide icon element to display
 * @param color - Color scheme for the icon background
 */
export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = "primary",
}: KpiCardProps) {
  // Get the color classes for this card's icon area
  const colors = colorMap[color];
  // Determine if the change is positive (for arrow direction and color)
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Two-column layout: text content on left, icon on right */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {/* Metric title (e.g., "Total Devices") */}
            <p className="text-sm font-medium text-dark-500 dark:text-dark-400">
              {title}
            </p>
            {/* The big number, formatted for readability */}
            <p className="text-3xl font-bold tracking-tight text-dark-900 dark:text-dark-50">
              {formatValue(value)}
            </p>
            {/* Trend indicator: only shown if a change value was provided */}
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                {/* Arrow + percentage: green for positive, red for negative */}
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-sm font-medium",
                    isPositive
                      ? "text-success-600 dark:text-success-400"
                      : "text-danger-600 dark:text-danger-400"
                  )}
                >
                  {isPositive ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )}
                  {/* Math.abs ensures we always show the positive number (the arrow already shows direction) */}
                  {Math.abs(change).toFixed(1)}%
                </span>
                {/* Context label (e.g., "vs last month") */}
                {changeLabel && (
                  <span className="text-xs text-dark-400">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Icon box: colored background circle/square with the icon inside */}
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              colors.bg
            )}
          >
            <span className={colors.icon}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
