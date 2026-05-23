"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { apiClient } from "@/lib/api-client";
import type { DeviceResponse } from "@cortexgrid/types";

interface DataPoint {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
}

const METRICS = ["temperature", "humidity", "pressure", "battery"];

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<DeviceResponse | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState("temperature");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", location: "", firmwareVersion: "", tags: "" });
  const [saving, setSaving] = useState(false);

  const fetchDevice = useCallback(async () => {
    try {
      const data = await apiClient.get<DeviceResponse>(`/devices/${deviceId}`);
      setDevice(data);
    } catch {
      setDevice(null);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchLatestTelemetry = useCallback(async () => {
    try {
      const result = await apiClient.get<{ data: DataPoint[] }>(
        `/telemetry/latest/${deviceId}`
      );
      setDataPoints(result.data ?? result as any ?? []);
    } catch {
      setDataPoints([]);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchDevice();
    fetchLatestTelemetry();
  }, [fetchDevice, fetchLatestTelemetry]);

  const startEdit = useCallback(() => {
    if (!device) return;
    setEditForm({
      name: device.name ?? "",
      location: device.location ?? "",
      firmwareVersion: device.firmwareVersion ?? "",
      tags: (device.tags ?? []).join(", "),
    });
    setIsEditing(true);
  }, [device]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const tags = editForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await apiClient.patch(`/devices/${deviceId}`, {
        name: editForm.name,
        location: editForm.location || undefined,
        firmwareVersion: editForm.firmwareVersion || undefined,
        tags,
      });
      setIsEditing(false);
      await fetchDevice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save device");
    } finally {
      setSaving(false);
    }
  }, [deviceId, editForm, fetchDevice]);

  const filteredDataPoints = useMemo(
    () => dataPoints.filter((dp) => dp.metric === selectedMetric),
    [dataPoints, selectedMetric]
  );

  const dataColumns: Column<DataPoint>[] = useMemo(
    () => [
      {
        key: "timestamp",
        header: "Timestamp",
        sortable: true,
        render: (row) => format(new Date(row.timestamp), "MMM d, HH:mm:ss"),
      },
      {
        key: "metric",
        header: "Metric",
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
        render: (row) => (
          <span className="font-mono font-medium">
            {row.value} {row.unit}
          </span>
        ),
      },
    ],
    []
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this device?")) return;
    try {
      await apiClient.delete(`/devices/${deviceId}`);
      router.push("/devices");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete device");
    }
  }, [deviceId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/devices")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back
        </Button>
        <p className="py-16 text-center text-dark-500">Device not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/devices")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
              {device.name}
            </h1>
            <StatusIndicator
              status={device.status === "ONLINE" ? "online" : device.status === "OFFLINE" ? "offline" : "maintenance"}
            />
          </div>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            {device.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-500 dark:text-dark-400">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-dark-300 bg-white px-3 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-500 dark:text-dark-400">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-dark-300 bg-white px-3 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-500 dark:text-dark-400">Firmware Version</label>
                  <input
                    type="text"
                    value={editForm.firmwareVersion}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, firmwareVersion: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-dark-300 bg-white px-3 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-500 dark:text-dark-400">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-dark-300 bg-white px-3 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                  />
                </div>
              </div>
            ) : (
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Cpu className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Type</dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">{device.type}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Serial Number</dt>
                  <dd className="font-mono text-sm text-dark-900 dark:text-dark-100">{device.serialNumber ?? "N/A"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Firmware</dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">v{device.firmwareVersion ?? "N/A"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Location</dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">{device.location ?? "N/A"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Signal className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Last Seen</dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    {device.lastSeenAt
                      ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })
                      : "Never"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Created</dt>
                  <dd className="text-sm text-dark-900 dark:text-dark-100">
                    {format(new Date(device.createdAt), "MMM d, yyyy")}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 text-dark-400" />
                <div>
                  <dt className="text-xs font-medium text-dark-500 dark:text-dark-400">Tags</dt>
                  <dd className="flex flex-wrap gap-1.5 pt-1">
                    {(device.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                    ))}
                  </dd>
                </div>
              </div>
            </dl>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Real-Time Telemetry</CardTitle>
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
              <TelemetryChart deviceId={deviceId} metrics={[selectedMetric]} height={250} />
            </CardContent>
          </Card>

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
