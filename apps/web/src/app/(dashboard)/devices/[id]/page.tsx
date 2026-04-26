/**
 * Device Detail Page (app/(dashboard)/devices/[id]/page.tsx)
 *
 * WHAT: Shows everything about a single IoT device -- its info, live telemetry chart,
 *       recent data points table, and alert history. Think of it as the "profile page"
 *       for one specific device.
 *
 * WHY IT EXISTS: When a user clicks on a device from the devices list page, they need
 *               to see its details, check its recent data, and investigate any alerts.
 *               This page gives them all that context in one view.
 *
 * The [id] in the folder name is a Next.js dynamic route segment.
 * When a user visits /devices/dev-001, the "id" param becomes "dev-001".
 *
 * Layout structure:
 *   1. Top bar: Back button, device name + status indicator, Edit/Delete buttons
 *   2. Middle row (3-column grid):
 *      - Left (1/3): Device info card (type, serial, firmware, location, last seen, tags)
 *      - Right (2/3): Telemetry chart with metric selector tabs + Recent data points table
 *   3. Bottom: Alert history for this specific device
 *
 * Data flow:
 *   URL param (id) -> used to fetch device data (currently mock) -> rendered in sections
 *   selectedMetric state -> filters both the chart and the data table to show one metric at a time
 */

"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  MapPin,
  Tag,
  Hash,
  Wrench,
  Clock,
  Signal,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@cortexgrid/ui/components/Button";
import { Badge } from "@cortexgrid/ui/components/Badge";
import { StatusIndicator } from "@cortexgrid/ui/components/StatusIndicator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@cortexgrid/ui/components/Card";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { AlertList } from "@/components/dashboard/alert-list";
import type { DeviceResponse, DeviceType, DeviceStatus } from "@cortexgrid/types";

// Mock data for a single device. In production, this would be fetched via
// an API call like: apiClient.get(`/api/devices/${deviceId}`)
const MOCK_DEVICE: DeviceResponse = {
  id: "dev-001",
  name: "Temperature Sensor A1",
  description: "Laboratory room temperature monitor with high precision sensing",
  type: "SENSOR" as DeviceType,
  status: "ONLINE" as DeviceStatus,
  organizationId: "org-001",
  serialNumber: "SN-TMP-001",
  location: "Building A, Floor 2, Room 204",
  firmwareVersion: "2.1.4",
  tags: ["temperature", "lab", "precision"],
  lastSeenAt: new Date().toISOString(),
  isConnected: true,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-03-20T14:30:00Z",
  metadata: { accuracy: "0.1C", range: "-40 to 125C" },
};

// Available metric types that the user can switch between.
// Each metric represents a different kind of sensor reading.
const METRICS = ["temperature", "humidity", "pressure", "battery"];

// Mock historical data points. These represent sensor readings over time.
// In production, these would come from a time-series database via API.
const MOCK_DATA_POINTS = [
  { id: "dp-1", timestamp: "2024-03-20T14:30:00Z", metric: "temperature", value: 23.5, unit: "celsius" },
  { id: "dp-2", timestamp: "2024-03-20T14:29:00Z", metric: "temperature", value: 23.7, unit: "celsius" },
  { id: "dp-3", timestamp: "2024-03-20T14:28:00Z", metric: "temperature", value: 23.4, unit: "celsius" },
  { id: "dp-4", timestamp: "2024-03-20T14:27:00Z", metric: "temperature", value: 23.6, unit: "celsius" },
  { id: "dp-5", timestamp: "2024-03-20T14:26:00Z", metric: "humidity", value: 45.2, unit: "percent" },
  { id: "dp-6", timestamp: "2024-03-20T14:25:00Z", metric: "humidity", value: 44.8, unit: "percent" },
  { id: "dp-7", timestamp: "2024-03-20T14:24:00Z", metric: "battery", value: 87.3, unit: "percent" },
  { id: "dp-8", timestamp: "2024-03-20T14:23:00Z", metric: "pressure", value: 1013.2, unit: "hPa" },
];

/**
 * DeviceDetailPage - The "profile page" for a single IoT device.
 *
 * This page reads the device ID from the URL (via useParams),
 * then displays the device's info, live telemetry, data history, and alerts.
 *
 * The user can switch between metrics (temperature, humidity, etc.) using
 * toggle buttons. Both the chart and the data table respond to this selection.
 */
export default function DeviceDetailPage() {
  // Extract the device ID from the URL: /devices/[id] -> params.id
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  // Which metric the user is currently viewing (temperature by default).
  // Changing this updates both the telemetry chart and the data table below it.
  const [selectedMetric, setSelectedMetric] = useState("temperature");

  // In production, this would be fetched from the API using the deviceId.
  // For now, we always show the same mock device regardless of the ID.
  const device = MOCK_DEVICE;

  // Filter data points to only show the currently selected metric.
  // When the user switches from "temperature" to "humidity", this re-computes.
  const filteredDataPoints = useMemo(
    () => MOCK_DATA_POINTS.filter((dp) => dp.metric === selectedMetric),
    [selectedMetric]
  );

  // Column definitions for the data points DataTable.
  // useMemo with empty deps because column definitions never change.
  const dataColumns: Column<(typeof MOCK_DATA_POINTS)[number]>[] = useMemo(
    () => [
      {
        key: "timestamp",
        header: "Timestamp",
        sortable: true,
        // Format ISO date string into a human-readable format like "Mar 20, 14:30:00"
        render: (row) => format(new Date(row.timestamp), "MMM d, HH:mm:ss"),
      },
      {
        key: "metric",
        header: "Metric",
        // Show the metric name as a colored badge (e.g., blue "temperature" tag)
        render: (row) => (
          <Badge variant="info" size="sm">
            {row.metric}
          </Badge>
        ),
      },
      {
        key: "value",
        header: "Value",
        sortable: true,
        // Show the numeric value in monospace font with its unit (e.g., "23.5 celsius")
        render: (row) => (
          <span className="font-mono font-medium">
            {row.value} {row.unit}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Top bar: navigation back button + device name + action buttons */}
      <div className="flex items-center gap-4">
        {/* Back button: returns to the devices list page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/devices")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <div className="flex-1">
          {/* Device name and live status indicator (green dot = online) */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
              {device.name}
            </h1>
            {/* StatusIndicator maps device status strings to visual states:
                ONLINE -> green dot, OFFLINE -> red dot, MAINTENANCE -> yellow dot */}
            <StatusIndicator
              status={device.status === "ONLINE" ? "online" : device.status === "OFFLINE" ? "offline" : "maintenance"}
            />
          </div>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            {device.description}
          </p>
        </div>
        {/* Action buttons for editing or deleting this device */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Edit
          </Button>
          <Button variant="danger" size="sm">
            Delete
          </Button>
        </div>
      </div>

      {/* Main content: 3-column grid with device info on left, telemetry + data on right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Device information card
            Shows all the static details about this device: type, serial number,
            firmware version, physical location, last communication time, and tags. */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Definition list (<dl>): each item is an icon + label + value pair */}
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Cpu className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Type
                  </dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    {device.type}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Serial Number
                  </dt>
                  {/* Monospace font for serial numbers so characters align neatly */}
                  <dd className="font-mono text-sm text-dark-900 dark:text-dark-100">
                    {device.serialNumber ?? "N/A"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Firmware
                  </dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    v{device.firmwareVersion ?? "N/A"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Location
                  </dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    {device.location ?? "N/A"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Signal className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Last Seen
                  </dt>
                  {/* formatDistanceToNow shows relative time like "5 minutes ago" or "2 hours ago" */}
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    {device.lastSeenAt
                      ? formatDistanceToNow(new Date(device.lastSeenAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Created
                  </dt>
                  {/* format shows an absolute date like "Jan 15, 2024" */}
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    {format(new Date(device.createdAt), "MMM d, yyyy")}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">
                    Tags
                  </dt>
                  {/* Tags are shown as small badges that users can use for categorization */}
                  <dd className="flex flex-wrap gap-1.5 pt-1">
                    {device.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* RIGHT COLUMNS: Telemetry chart + Data points table */}
        <div className="space-y-6 lg:col-span-2">
          {/* Telemetry chart card with metric selector tabs in the header.
              Users click a metric button (temperature, humidity, etc.) to switch
              what the chart displays. The selected button turns blue. */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Real-Time Telemetry</CardTitle>
              {/* Metric toggle buttons: act as tabs to switch which metric the chart shows */}
              <div className="flex gap-2">
                {METRICS.map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedMetric === metric
                        ? "bg-primary-600 text-white"
                        : "bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-400 dark:hover:bg-dark-700"
                    }`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* The chart subscribes to WebSocket updates for this device and metric */}
              <TelemetryChart
                deviceId={deviceId}
                metrics={[selectedMetric]}
                height={250}
              />
            </CardContent>
          </Card>

          {/* Recent data points table: shows the raw numbers behind the chart.
              Only shows data for the currently selected metric. */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Data Points</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={dataColumns}
                data={filteredDataPoints}
                keyExtractor={(row) => row.id}
                pageSize={5}
                emptyMessage="No data points for the selected metric"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom section: Alert history specific to this device.
          The deviceId prop filters alerts to only show ones triggered by this device. */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertList deviceId={deviceId} limit={5} />
        </CardContent>
      </Card>
    </div>
  );
}
