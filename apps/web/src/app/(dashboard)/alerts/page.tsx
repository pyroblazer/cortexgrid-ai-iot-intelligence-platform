"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Card } from "@cortexgrid/ui/components/Card";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import { apiClient } from "@/lib/api-client";
import type { AlertSeverity, AlertStatus } from "@cortexgrid/types";

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

const SEVERITY_CONFIG: Record<AlertSeverity, { variant: "danger" | "warning" | "info"; icon: typeof AlertTriangle }> = {
  CRITICAL: { variant: "danger", icon: ShieldAlert },
  WARNING: { variant: "warning", icon: AlertTriangle },
  INFO: { variant: "info", icon: Bell },
};

const STATUS_CONFIG: Record<AlertStatus, { variant: "danger" | "warning" | "success"; label: string }> = {
  ACTIVE: { variant: "danger", label: "Active" },
  ACKNOWLEDGED: { variant: "warning", label: "Acknowledged" },
  RESOLVED: { variant: "success", label: "Resolved" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const result = await apiClient.get<{ data: any[]; meta: { total: number } }>(
        `/alerts?${params.toString()}`
      );
      setAlerts(
        (result.data ?? []).map((a: any) => ({
          id: a.id,
          title: a.title ?? a.name ?? "Alert",
          message: a.message ?? a.description ?? "",
          severity: a.severity ?? "INFO",
          status: a.status ?? "ACTIVE",
          deviceId: a.deviceId ?? null,
          deviceName: a.device?.name ?? a.deviceName ?? "Unknown Device",
          createdAt: a.createdAt ?? new Date().toISOString(),
          acknowledgedBy: a.acknowledgedBy ?? null,
        }))
      );
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const activeCount = useMemo(
    () => alerts.filter((a) => a.status === "ACTIVE").length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        !search ||
        alert.title.toLowerCase().includes(search.toLowerCase()) ||
        alert.deviceName.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [alerts, search]);

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/alerts/${id}/acknowledge`, { note: "Acknowledged via dashboard" });
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "ACKNOWLEDGED" as AlertStatus, acknowledgedBy: "current-user" } : a
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to acknowledge alert");
    }
  }, []);

  const handleResolve = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/alerts/${id}/resolve`);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "RESOLVED" as AlertStatus } : a
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  }, []);

  const columns: Column<AlertEntry>[] = useMemo(
    () => [
      {
        key: "severity",
        header: "Severity",
        render: (row) => {
          const config = SEVERITY_CONFIG[row.severity as AlertSeverity] ?? SEVERITY_CONFIG.INFO;
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
        render: (row) => (
          <div>
            <p className="font-medium text-dark-900 dark:text-dark-100">{row.title}</p>
            <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400 line-clamp-1">{row.message}</p>
          </div>
        ),
      },
      {
        key: "deviceName",
        header: "Device",
        sortable: true,
        render: (row) => (
          <span className="text-sm text-primary-600 dark:text-primary-400">{row.deviceName}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => {
          const config = STATUS_CONFIG[row.status as AlertStatus] ?? STATUS_CONFIG.ACTIVE;
          return (
            <Badge variant={config.variant} size="sm" dot>{config.label}</Badge>
          );
        },
      },
      {
        key: "createdAt",
        header: "Time",
        sortable: true,
        render: (row) => (
          <span className="text-sm text-dark-500 dark:text-dark-400">
            {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            {row.status === "ACTIVE" && (
              <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleAcknowledge(row.id); }}>
                Acknowledge
              </Button>
            )}
            {(row.status === "ACTIVE" || row.status === "ACKNOWLEDGED") && (
              <Button variant="primary" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleResolve(row.id); }} leftIcon={<CheckCircle className="h-3 w-3" />}>
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
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Alerts</h1>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">Monitor and manage system alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger-500" />
              <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Active: {activeCount}</span>
            </div>
          </Card>
          <Link href="/alerts/rules">
            <Button variant="outline" size="sm">Manage Rules</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input placeholder="Search alerts..." prefixIcon={<Search className="h-4 w-4" />} value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <select value={severityFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeverityFilter(e.target.value)} className="h-10 rounded-lg border border-dark-300 bg-white py-2 pl-9 pr-8 text-sm text-dark-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300" aria-label="Filter by severity">
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>
          <select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300" aria-label="Filter by status">
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable columns={columns} data={filteredAlerts} keyExtractor={(row) => row.id} pageSize={10} emptyMessage="No alerts match your filters" />
      )}
    </div>
  );
}
