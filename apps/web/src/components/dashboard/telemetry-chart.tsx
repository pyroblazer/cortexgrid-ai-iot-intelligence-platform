/**
 * Telemetry Chart Component (components/dashboard/telemetry-chart.tsx)
 *
 * WHAT: A real-time line chart that displays sensor telemetry data (temperature, humidity, etc.)
 *       over time. It connects to the WebSocket for live data when available, and falls back
 *       to generating realistic mock data for development and demos.
 *
 * WHY IT EXISTS: The dashboard and device detail pages need to show trends in sensor data.
 *               Instead of raw numbers, a chart makes it easy to spot patterns, spikes, and dips.
 *
 * How chart rendering works:
 *
 *   1. The component tries to get live data via the useTelemetry hook
 *      - If connected to WebSocket: uses real data streaming from devices
 *      - If not connected: generates mock data that updates every 5 seconds
 *
 *   2. Data format for the chart (Recharts library):
 *      Each data point is an object like: { time: "14:30", temperature: 23.5 }
 *      - "time" is the X-axis value
 *      - Each metric becomes a Y-axis line on the chart
 *
 *   3. The chart automatically re-renders when new data points arrive,
 *      creating the smooth real-time animation effect.
 *
 * Mock data generation:
 *   When no live connection is available, generateMockData() creates realistic-looking
 *   data based on typical ranges for each metric type:
 *   - Temperature: 19-25 C (around 22)
 *   - Humidity: 40-50% (around 45)
 *   - Pressure: 1011-1015 hPa (around 1013)
 *   - Battery: 80-90% (around 85)
 *
 *   A setInterval updates the mock data every 5 seconds, adding a new point and
 *   removing the oldest one, simulating a rolling time window.
 *
 * Live vs Mock indicator:
 *   A small dot in the header shows the connection status:
 *   - Green pulsing dot + "Live" = receiving real data
 *   - Gray dot + "Mock data" = showing simulated data
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@cortexgrid/ui/components/Card";
import { useTelemetry } from "@/hooks/use-telemetry";

// Color palette for each metric type.
// Each metric gets a consistent color across all charts in the app.
const METRIC_COLORS: Record<string, string> = {
  temperature: "#ef4444",  // Red for temperature (hot = red makes intuitive sense)
  humidity: "#3b82f6",     // Blue for humidity (water = blue)
  pressure: "#8b5cf6",     // Purple for pressure
  battery: "#22c55e",      // Green for battery (green = charged)
  default: "#6b7280",      // Gray for unknown metrics
};

/** Props for configuring the telemetry chart */
interface TelemetryChartProps {
  title?: string;       // Chart title (default: "Real-Time Telemetry")
  deviceId: string;     // Which device to show data for (use "all" for aggregate)
  metrics?: string[];   // Which metrics to display as lines (default: ["temperature"])
  height?: number;      // Chart height in pixels (default: 300)
}

/**
 * generateMockData - Creates realistic-looking fake telemetry data.
 *
 * This function generates a series of data points at 5-minute intervals,
 * with random variations around typical values for each metric type.
 *
 * @param metric - The type of metric to generate data for
 * @param count - Number of data points to generate
 * @returns Array of objects like { time: "14:30", temperature: 23.45 }
 */
function generateMockData(metric: string, count: number) {
  const now = Date.now();
  const data = [];
  for (let i = count; i >= 0; i--) {
    // Each point is 5 minutes apart
    const timestamp = new Date(now - i * 5 * 60 * 1000);
    let value: number;
    // Generate values centered around realistic baselines with random noise
    switch (metric) {
      case "temperature":
        value = 22 + Math.random() * 6 - 3;  // 19-25 C
        break;
      case "humidity":
        value = 45 + Math.random() * 10 - 5;  // 40-50%
        break;
      case "pressure":
        value = 1013 + Math.random() * 4 - 2;  // 1011-1015 hPa
        break;
      case "battery":
        value = 85 + Math.random() * 10 - 5;   // 80-90%
        break;
      default:
        value = Math.random() * 100;
    }
    data.push({
      // Format time as "HH:MM" for the X-axis labels
      time: timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      // Use the metric name as the key so Recharts can plot it as a separate line
      [metric]: parseFloat(value.toFixed(2)),
    });
  }
  return data;
}

/**
 * TelemetryChart - A real-time line chart for IoT sensor data.
 *
 * This component has a dual-mode data strategy:
 * - LIVE MODE: When connected via WebSocket, it displays real data from devices
 * - MOCK MODE: When not connected, it generates realistic fake data that auto-updates
 *
 * The transition between modes is seamless -- the user sees a chart either way.
 *
 * @param title - The chart title displayed in the card header
 * @param deviceId - Device to subscribe to (or "all" for aggregate data)
 * @param metrics - Array of metric names to plot as separate lines
 * @param height - The chart height in pixels
 */
export function TelemetryChart({
  title = "Real-Time Telemetry",
  deviceId,
  metrics = ["temperature"],
  height = 300,
}: TelemetryChartProps) {
  // Subscribe to live telemetry data via WebSocket (returns empty array if not connected)
  const { data: liveData, isConnected } = useTelemetry({
    deviceId,
    maxDataPoints: 50,
  });

  // Mock data state: initialized with 24 data points for immediate display
  const [mockData, setMockData] = useState(() =>
    generateMockData(metrics[0], 24)
  );

  // Set up an interval to simulate real-time data arrival when not connected.
  // Every 5 seconds, a new mock data point is added and the oldest is removed,
  // creating a "sliding window" effect that looks like live data.
  useEffect(() => {
    // If we have a live connection with data, skip the mock data interval.
    // The live data from useTelemetry will drive the chart instead.
    if (isConnected && liveData.length > 0) return;

    const interval = setInterval(() => {
      setMockData((prev) => {
        // Remove the oldest point (first element) to keep the array size constant
        const next = [...prev.slice(1)];
        const now = new Date();
        // Build a new data point with the current time
        const newPoint: Record<string, string | number> = {
          time: now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        // For each metric, generate a new value that's close to the previous one
        // (this makes the line chart look smooth rather than jumping randomly)
        metrics.forEach((metric) => {
          const last = prev[prev.length - 1]?.[metric] ?? 50;
          // Add random noise of +/- 2 around the last value
          newPoint[metric] = parseFloat(
            (last + (Math.random() - 0.5) * 4).toFixed(2)
          );
        });
        next.push(newPoint as typeof prev[0]);
        return next;
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected, liveData, metrics]);

  // Determine which data source to use for the chart.
  // Priority: live data > mock data
  const chartData = useMemo(() => {
    if (isConnected && liveData.length > 0) {
      // Transform live data into the format Recharts expects:
      // { time: "14:30", temperature: 23.5 }
      return liveData.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        [point.metric]: point.value,
      }));
    }
    return mockData;
  }, [isConnected, liveData, mockData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5">
          {/* Pulsing green dot when live, static gray dot when mock */}
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-success-500 animate-pulse" : "bg-dark-300"
            }`}
          />
          <span className="text-xs text-dark-500 dark:text-dark-400">
            {isConnected ? "Live" : "Mock data"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* The chart container uses a fixed height set via the style prop.
            ResponsiveContainer makes the chart fill the available width. */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              {/* Dashed grid lines in the background for readability */}
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-dark-200 dark:stroke-dark-700"
              />
              {/* X-axis: shows time labels (e.g., "14:30") */}
              <XAxis
                dataKey="time"
                tick={{ fill: "rgb(107 114 128)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              {/* Y-axis: shows numeric values. Width=45 reserves space for the labels */}
              <YAxis
                tick={{ fill: "rgb(107 114 128)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              {/* Tooltip: shows values when hovering over the chart */}
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(255 255 255)",
                  borderColor: "rgb(229 231 235)",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              {/* Legend: shows which color corresponds to which metric */}
              <Legend />
              {/* Render one <Line> per metric. Each gets its own color from METRIC_COLORS.
                  type="monotone" makes the line smooth (curved) between points.
                  dot={false} hides the dots on each data point for a cleaner look.
                  activeDot shows a dot when the user hovers over the line. */}
              {metrics.map((metric) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={METRIC_COLORS[metric] || METRIC_COLORS.default}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
