import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "../lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface DataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
}

export interface TelemetryChartProps {
  data: DataPoint[];
  series: SeriesConfig[];
  chartType?: "line" | "area";
  timeFormat?: (timestamp: string) => string;
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const defaultTimeFormat = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const CHART_COLORS = [
  "#3b82f6",
  "#a855f7",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
];

function TelemetryChart({
  data,
  series,
  chartType = "line",
  timeFormat = defaultTimeFormat,
  height = 300,
  loading = false,
  emptyMessage = "No telemetry data available",
  title,
  className,
  showGrid = true,
  showLegend = true,
  yAxisLabel,
}: TelemetryChartProps) {
  const colors = useMemo(
    () =>
      series.map((s, i) => s.color || CHART_COLORS[i % CHART_COLORS.length]),
    [series]
  );

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dark-200 bg-white dark:border-dark-700 dark:bg-dark-900",
          className
        )}
        style={{ height }}
      >
        <LoadingSpinner size="md" text="Loading telemetry..." />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dark-200 bg-white text-dark-500 dark:border-dark-700 dark:bg-dark-900 dark:text-dark-400",
          className
        )}
        style={{ height }}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const ChartComponent = chartType === "area" ? AreaChart : LineChart;

  return (
    <div
      className={cn(
        "rounded-lg border border-dark-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900",
        className
      )}
    >
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-dark-800 dark:text-dark-200">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              className="dark:opacity-20"
            />
          )}
          <XAxis
            dataKey="timestamp"
            tickFormatter={timeFormat}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            stroke="#cbd5e1"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            stroke="#cbd5e1"
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fill: "#94a3b8" },
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "12px",
            }}
            labelFormatter={timeFormat}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
          )}
          {series.map((s, i) => {
            const color = colors[i];
            if (chartType === "area") {
              return (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              );
            }
            return (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

TelemetryChart.displayName = "TelemetryChart";

export { TelemetryChart };
