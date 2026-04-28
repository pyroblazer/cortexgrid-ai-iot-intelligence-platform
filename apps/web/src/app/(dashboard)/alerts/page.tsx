/**
 * Alerts Page (app/(dashboard)/alerts/page.tsx)
 *
 * WHAT: Shows all system alerts in a searchable, filterable table. Users can acknowledge
 *       and resolve alerts, filter by severity and status, and search by alert title or device name.
 *
 * WHY IT EXISTS: In an IoT system, things go wrong -- devices go offline, sensors report
 *               unusual values, batteries die. This page gives operators a central place
 *               to see all problems, triage them, and mark them as handled.
 *
 * Alert severity system (3 levels):
 *   - CRITICAL (red): Something is seriously wrong and needs immediate attention.
 *     Examples: temperature dangerously high, device offline for a long time.
 *   - WARNING (yellow): Something might become a problem if not addressed soon.
 *     Examples: battery getting low, approaching plan limits.
 *   - INFO (blue): Informational notices that don't require action.
 *     Examples: firmware update available, new device registered.
 *
 * Alert lifecycle (status flow):
 *   ACTIVE -> ACKNOWLEDGED -> RESOLVED
 *   - ACTIVE: Just happened, nobody has looked at it yet
 *   - ACKNOWLEDGED: Someone has seen it and is working on it
 *   - RESOLVED: The issue has been fixed
 *
 * Data flow:
 *   Alerts are managed with local state (useState) for this demo.
 *   In production, acknowledge/resolve actions would call the API
 *   and the alert list would be fetched via React Query with real-time updates via WebSocket.
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { Badge } from "@cortexgrid/ui/components/Badge";
import {
  Card,
} from "@cortexgrid/ui/components/Card";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import type { AlertSeverity, AlertStatus } from "@cortexgrid/types";

// Shape of a single alert entry in the system.
// Each alert is tied to a specific device and has a severity level and lifecycle status.
interface AlertEntry {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  deviceId: string | null;
  deviceName: string;
  createdAt: string;
  acknowledgedBy: string | null;
}

// Mock alerts representing different severity levels and lifecycle stages.
// The timestamps use Date.now() minus varying durations to simulate recent events.
const MOCK_ALERTS: AlertEntry[] = [
  {
    id: "alert-001",
    title: "High Temperature Detected",
    message: "Temperature exceeded threshold of 30C (current: 35.2C)",
    severity: "CRITICAL" as AlertSeverity,
    status: "ACTIVE" as AlertStatus,
    deviceId: "dev-001",
    deviceName: "Temperature Sensor A1",
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    acknowledgedBy: null,
  },
  {
    id: "alert-002",
    title: "Device Offline",
    message: "Motion Detector C1 has been offline for over 1 hour",
    severity: "WARNING" as AlertSeverity,
    status: "ACTIVE" as AlertStatus,
    deviceId: "dev-003",
    deviceName: "Motion Detector C1",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    acknowledgedBy: null,
  },
  {
    id: "alert-003",
    title: "Low Battery Warning",
    message: "Battery level below 15% (current: 12.3%)",
    severity: "WARNING" as AlertSeverity,
    status: "ACKNOWLEDGED" as AlertStatus, // Someone has seen this alert
    deviceId: "dev-005",
    deviceName: "Edge Gateway Alpha",
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    acknowledgedBy: "user-001",
  },
  {
    id: "alert-004",
    title: "Firmware Update Available",
    message: "New firmware version 2.2.0 available for Temperature Sensor A1",
    severity: "INFO" as AlertSeverity,
    status: "ACTIVE" as AlertStatus,
    deviceId: "dev-001",
    deviceName: "Temperature Sensor A1",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    acknowledgedBy: null,
  },
  {
    id: "alert-005",
    title: "Humidity Spike",
    message: "Humidity level jumped from 45% to 78% in 5 minutes",
    severity: "CRITICAL" as AlertSeverity,
    status: "RESOLVED" as AlertStatus, // This issue has been fixed
    deviceId: "dev-002",
    deviceName: "Humidity Sensor B3",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    acknowledgedBy: "user-002",
  },
];

// Maps severity levels to visual styling (badge color) and icons.
// CRITICAL gets a red badge with a shield icon, WARNING gets yellow with a triangle, etc.
const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { variant: "danger" | "warning" | "info"; icon: typeof AlertTriangle }
> = {
  CRITICAL: { variant: "danger", icon: ShieldAlert },
  WARNING: { variant: "warning", icon: AlertTriangle },
  INFO: { variant: "info", icon: Bell },
};

// Maps alert lifecycle statuses to visual styling.
// ACTIVE is red (needs attention), ACKNOWLEDGED is yellow (being worked on),
// RESOLVED is green (fixed).
const STATUS_CONFIG: Record<
  AlertStatus,
  { variant: "danger" | "warning" | "success"; label: string }
> = {
  ACTIVE: { variant: "danger", label: "Active" },
  ACKNOWLEDGED: { variant: "warning", label: "Acknowledged" },
  RESOLVED: { variant: "success", label: "Resolved" },
};

/**
 * AlertsPage - Alert management and triage interface.
 *
 * State management:
 *   - alerts: the full list of alerts (mutable for acknowledge/resolve actions)
 *   - search, severityFilter, statusFilter: filter controls
 *
 * Actions:
 *   - Acknowledge: marks an ACTIVE alert as "someone is looking at this"
 *   - Resolve: marks an alert as "the problem has been fixed"
 *   Both actions update local state. In production, they'd call the API.
 */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEntry[]>(MOCK_ALERTS);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Count of currently active (untriaged) alerts for the summary badge at the top.
  const activeCount = useMemo(
    () => alerts.filter((a) => a.status === "ACTIVE").length,
    [alerts]
  );

  // Apply all three filters (search + severity + status) to the alert list.
  // Uses AND logic: all active filters must match.
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Text search: matches against alert title OR device name
      const matchesSearch =
        !search ||
        alert.title.toLowerCase().includes(search.toLowerCase()) ||
        alert.deviceName.toLowerCase().includes(search.toLowerCase());
      // Severity filter: exact match or "all" to skip
      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter;
      // Status filter: exact match or "all" to skip
      const matchesStatus =
        statusFilter === "all" || alert.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, search, severityFilter, statusFilter]);

  /**
   * handleAcknowledge - Marks an alert as "seen by a human".
   * Updates the alert's status to ACKNOWLEDGED and records who acknowledged it.
   * Only available for ACTIVE alerts.
   */
  const handleAcknowledge = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "ACKNOWLEDGED" as AlertStatus, acknowledgedBy: "current-user" } : a
      )
    );
  }, []);

  /**
   * handleResolve - Marks an alert as "the problem has been fixed".
   * Updates the alert's status to RESOLVED.
   * Available for both ACTIVE and ACKNOWLEDGED alerts.
   */
  const handleResolve = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "RESOLVED" as AlertStatus } : a
      )
    );
  }, []);

  // Column definitions for the alerts DataTable.
  // Each column can have a custom render function for rich content like badges and buttons.
  const columns: Column<AlertEntry>[] = useMemo(
    () => [
      {
        key: "severity",
        header: "Severity",
        // Render the severity as a colored badge with an appropriate icon
        render: (row) => {
          const config = SEVERITY_CONFIG[row.severity];
          const Icon = config.icon;
          return (
            <Badge variant={config.variant} size="sm">
              <Icon className="h-3 w-3" />
              {row.severity}
            </Badge>
          );
        },
      },
      {
        key: "title",
        header: "Alert",
        sortable: true,
        // Show both the alert title and a one-line preview of the message
        render: (row) => (
          <div>
            <p className="font-medium text-dark-900 dark:text-dark-100">
              {row.title}
            </p>
            {/* line-clamp-1 truncates long messages to a single line with "..." */}
            <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400 line-clamp-1">
              {row.message}
            </p>
          </div>
        ),
      },
      {
        key: "deviceName",
        header: "Device",
        sortable: true,
        // Device name is shown as a link-colored text (in production, this could be clickable)
        render: (row) => (
          <span className="text-sm text-primary-600 dark:text-primary-400">
            {row.deviceName}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        // Render the lifecycle status as a colored badge with a dot indicator
        render: (row) => {
          const config = STATUS_CONFIG[row.status];
          return (
            <Badge variant={config.variant} size="sm" dot>
              {config.label}
            </Badge>
          );
        },
      },
      {
        key: "createdAt",
        header: "Time",
        sortable: true,
        // Show relative time like "5 minutes ago" or "2 days ago"
        render: (row) => (
          <span className="text-sm text-dark-500 dark:text-dark-400">
            {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        // Action buttons change based on the alert's current status:
        // - ACTIVE alerts: show "Acknowledge" and "Resolve"
        // - ACKNOWLEDGED alerts: show only "Resolve"
        // - RESOLVED alerts: no action buttons needed
        render: (row) => (
          <div className="flex items-center gap-2">
            {row.status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  // stopPropagation prevents the row click handler from also firing
                  e.stopPropagation();
                  handleAcknowledge(row.id);
                }}
              >
                Acknowledge
              </Button>
            )}
            {(row.status === "ACTIVE" || row.status === "ACKNOWLEDGED") && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolve(row.id);
                }}
                leftIcon={<CheckCircle className="h-3 w-3" />}
              >
                Resolve
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleAcknowledge, handleResolve]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            Monitor and manage system alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger-500" />
              <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                Active: {activeCount}
              </span>
            </div>
          </Card>
          <Link href="/alerts/rules">
            <Button variant="outline" size="sm">
              Manage Rules
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search alerts..."
            prefixIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 rounded-lg border border-dark-300 bg-white py-2 pl-9 pr-8 text-sm text-dark-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300"
              aria-label="Filter by severity"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredAlerts}
        keyExtractor={(row) => row.id}
        pageSize={10}
        emptyMessage="No alerts match your filters"
      />
    </div>
  );
}
