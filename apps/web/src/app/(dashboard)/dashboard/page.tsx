/**
 * Dashboard Page (app/(dashboard)/dashboard/page.tsx)
 *
 * WHAT: The main dashboard that users see after logging in. It provides a bird's-eye
 *       view of their entire IoT infrastructure -- how many devices they have, which
 *       are online, recent alerts, and live telemetry data.
 *
 * WHY IT EXISTS: This is the "mission control" of the app. Instead of making users
 *               dig through individual device pages to understand their system, this
 *               page summarizes everything at a glance so they can quickly spot problems.
 *
 * Layout structure (top to bottom):
 *   1. Page title + subtitle
 *   2. KPI Cards row: 4 metric cards showing key numbers at a glance
 *      - Total Devices, Active Devices, Active Alerts, Data Points (24h)
 *      - Each card shows the current value and a percentage change from a previous period
 *   3. Middle row: Real-time telemetry chart (2/3 width) + Device status bars (1/3)
 *   4. Bottom row: Recent alerts list (2/3 width) + Quick action buttons (1/3)
 *
 * Data flow:
 *   - KPI values and chart data are currently hardcoded (mock data).
 *   - In production, these would come from API calls via React Query.
 *   - The TelemetryChart component connects to WebSockets for live data streaming.
 *   - The AlertList component fetches recent alerts from the API.
 */

"use client";

import { useMemo } from "react";
import {
  Cpu,
  Wifi,
  AlertTriangle,
  Database,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@cortexgrid/ui/components/Card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { AlertList } from "@/components/dashboard/alert-list";

/**
 * DashboardPage - The main overview page for the IoT platform.
 *
 * This page is organized in a grid layout that adapts to screen size:
 * - On phones: everything stacks vertically
 * - On tablets: 2-column grid for KPI cards
 * - On desktops: 4-column KPI row, 3-column content rows
 */
export default function DashboardPage() {
  // Device status breakdown data used for the progress bars in the status card.
  // useMemo prevents re-creating this array on every render since the data is static.
  const pieData = useMemo(
    () => [
      { name: "Online", value: 42, color: "#22c55e" },
      { name: "Offline", value: 7, color: "#ef4444" },
      { name: "Maintenance", value: 3, color: "#3b82f6" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
          Overview of your IoT infrastructure
        </p>
      </div>

      {/* ROW 1: KPI (Key Performance Indicator) Cards
          These 4 cards give users the most important numbers at a glance.
          Each card shows: title, big number, trend arrow with % change, and an icon.
          - "change" is a percentage: positive = green arrow up, negative = red arrow down
          - "color" controls the icon background color scheme */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Devices"
          value={52}
          change={12.5}
          changeLabel="vs last month"
          icon={<Cpu className="h-5 w-5" />}
          color="primary"
        />
        <KpiCard
          title="Active Devices"
          value={42}
          change={8.2}
          changeLabel="vs last month"
          icon={<Wifi className="h-5 w-5" />}
          color="success"
        />
        {/* Negative change (-15.3) shows as a red down-arrow, but fewer alerts is good! */}
        <KpiCard
          title="Active Alerts"
          value={7}
          change={-15.3}
          changeLabel="vs last week"
          icon={<AlertTriangle className="h-5 w-5" />}
          color="danger"
        />
        <KpiCard
          title="Data Points (24h)"
          value={128473}
          change={22.1}
          changeLabel="vs yesterday"
          icon={<Database className="h-5 w-5" />}
          color="accent"
        />
      </div>

      {/* ROW 2: Telemetry chart + Device status overview
          The chart takes 2/3 of the width, the status bars take 1/3. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Real-time telemetry chart: shows temperature and humidity over the last 24 hours.
            deviceId="all" means it aggregates data from all devices, not just one.
            The chart component handles WebSocket connections internally for live updates. */}
        <div className="xl:col-span-2">
          <TelemetryChart
            title="Real-Time Telemetry (Last 24h)"
            deviceId="all"
            metrics={["temperature", "humidity"]}
          />
        </div>

        {/* Device Status Overview: horizontal progress bars showing online/offline/maintenance counts.
            This is a simpler alternative to a pie chart -- easier to read at a glance. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-500" />
              Device Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pieData.map((item) => {
                // Calculate the total of all device counts and the percentage for this status
                const total = pieData.reduce((acc, cur) => acc + cur.value, 0);
                const percentage = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.name} className="space-y-2">
                    {/* Status label row: colored dot + name on left, count + percentage on right */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-dark-700 dark:text-dark-300">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-dark-900 dark:text-dark-100">
                          {item.value}
                        </span>
                        <span className="text-dark-400">({percentage}%)</span>
                      </div>
                    </div>
                    {/* Progress bar: width is set to the calculated percentage.
                        transition-all duration-500 makes the bar animate smoothly. */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Recent alerts + Quick action shortcuts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent alerts list: shows the 5 most recent alerts with a "View All" link */}
        <div className="xl:col-span-2">
          <AlertList limit={5} showViewAll />
        </div>

        {/* Quick Actions: shortcut buttons to common tasks.
            These are simple <a> links styled as cards with hover effects.
            Each has a different color accent matching its function. */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/devices/new"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-dark-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
              >
                <Cpu className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  Add Device
                </span>
              </a>
              <a
                href="/alerts/rules"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-warning-300 hover:bg-warning-50 dark:border-dark-700 dark:hover:border-warning-700 dark:hover:bg-warning-900/20"
              >
                <AlertTriangle className="h-6 w-6 text-warning-600 dark:text-warning-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  Alert Rules
                </span>
              </a>
              <a
                href="/ai"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-dark-700 dark:hover:border-accent-700 dark:hover:bg-accent-900/20"
              >
                <ArrowUpRight className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  AI Assistant
                </span>
              </a>
              <a
                href="/billing"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-success-300 hover:bg-success-50 dark:border-dark-700 dark:hover:border-success-700 dark:hover:bg-success-900/20"
              >
                <ArrowDownRight className="h-6 w-6 text-success-600 dark:text-success-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  View Plans
                </span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
