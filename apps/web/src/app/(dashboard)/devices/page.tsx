"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { DeviceTable } from "@/components/devices/device-table";
import { apiClient } from "@/lib/api-client";
import type { DeviceResponse, DeviceStatus, DeviceType } from "@cortexgrid/types";

const STATUS_OPTIONS: { label: string; value: DeviceStatus }[] = [
  { label: "All Statuses", value: undefined as unknown as DeviceStatus },
  { label: "Online", value: "ONLINE" as DeviceStatus },
  { label: "Offline", value: "OFFLINE" as DeviceStatus },
  { label: "Maintenance", value: "MAINTENANCE" as DeviceStatus },
];

const TYPE_OPTIONS: { label: string; value: DeviceType }[] = [
  { label: "All Types", value: undefined as unknown as DeviceType },
  { label: "Sensor", value: "SENSOR" as DeviceType },
  { label: "Actuator", value: "ACTUATOR" as DeviceType },
  { label: "Gateway", value: "GATEWAY" as DeviceType },
];

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchDevices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("limit", "100");

      const result = await apiClient.get<{ data: DeviceResponse[]; meta: { total: number } }>(
        `/devices?${params.toString()}`
      );
      setDevices(result.data ?? []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this device?")) return;
    try {
      await apiClient.delete(`/devices/${id}`);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete device");
    }
  }, []);

  const handleViewDevice = useCallback(
    (id: string) => {
      router.push(`/devices/${id}`);
    },
    [router]
  );

  const handleExport = useCallback(() => {
    if (devices.length === 0) return;
    const headers = ["name", "serialNumber", "type", "status", "location", "lastSeenAt"];
    const csvRows = [
      headers.join(","),
      ...devices.map((d) =>
        headers.map((h) => {
          const val = (d as any)[h] ?? "";
          return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val);
        }).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devices-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [devices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
            Devices
          </h1>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            Manage and monitor your IoT devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push("/devices/new")}
          >
            Add Device
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search devices by name, serial, or location..."
            prefixIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-dark-300 bg-white py-2 pl-9 pr-8 text-sm text-dark-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? "all"}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300"
            aria-label="Filter by type"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? "all"}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : devices.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-dark-500">No devices found</p>
          <Button
            className="mt-4"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push("/devices/new")}
          >
            Add Your First Device
          </Button>
        </div>
      ) : (
        <DeviceTable
          devices={devices}
          onView={handleViewDevice}
          onEdit={(id) => router.push(`/devices/${id}`)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
