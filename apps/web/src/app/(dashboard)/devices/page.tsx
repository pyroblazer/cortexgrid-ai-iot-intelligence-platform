/**
 * Devices Page (app/(dashboard)/devices/page.tsx)
 *
 * WHAT: Shows a searchable, filterable table of all IoT devices in the organization.
 *       Users can search by name/serial/location, filter by status and device type,
 *       and click a device to see its details.
 *
 * WHY IT EXISTS: This is the "device inventory" page. When users need to check on a
 *               specific sensor, find offline devices, or add a new device, they come here.
 *
 * Filtering system (how it works):
 *   - Three independent filters: text search, status dropdown, type dropdown
 *   - All filters are applied together (AND logic -- a device must match ALL active filters)
 *   - The text search checks against name, serial number, AND location (any one is a match)
 *   - Filtering happens client-side via useMemo -- the device list is re-computed
 *     whenever any filter changes, without making a new API call
 *
 * Data flow:
 *   MOCK_DEVICES (static data) -> filteredDevices (useMemo) -> DeviceTable component
 *   In production, MOCK_DEVICES would be replaced with a React Query fetch.
 *
 * Component structure:
 *   Page header (title + Add Device button)
 *   -> Filter bar (search input + status dropdown + type dropdown)
 *   -> DeviceTable (renders the filtered list with sortable columns and action buttons)
 */

"use client";

import { useState, useMemo, useCallback } from "react";
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
import type { DeviceResponse, DeviceStatus, DeviceType } from "@cortexgrid/types";

// Dropdown options for the status filter.
// The first option uses undefined as a trick to represent "show all statuses".
const STATUS_OPTIONS: { label: string; value: DeviceStatus }[] = [
  { label: "All Statuses", value: undefined as unknown as DeviceStatus },
  { label: "Online", value: "ONLINE" as DeviceStatus },
  { label: "Offline", value: "OFFLINE" as DeviceStatus },
  { label: "Maintenance", value: "MAINTENANCE" as DeviceStatus },
];

// Dropdown options for the device type filter.
// IoT devices come in different flavors: sensors (read data), actuators (do things), gateways (route data).
const TYPE_OPTIONS: { label: string; value: DeviceType }[] = [
  { label: "All Types", value: undefined as unknown as DeviceType },
  { label: "Sensor", value: "SENSOR" as DeviceType },
  { label: "Actuator", value: "ACTUATOR" as DeviceType },
  { label: "Gateway", value: "GATEWAY" as DeviceType },
];

// Mock device data for development/demo purposes.
// In production, this would be fetched from the API using React Query.
// Each device has a rich set of properties: type, status, location, firmware, tags, etc.
const MOCK_DEVICES: DeviceResponse[] = [
  {
    id: "dev-001",
    name: "Temperature Sensor A1",
    description: "Lab room temperature monitor",
    type: "SENSOR" as DeviceType,
    status: "ONLINE" as DeviceStatus,
    organizationId: "org-001",
    serialNumber: "SN-TMP-001",
    location: "Building A, Floor 2",
    firmwareVersion: "2.1.4",
    tags: ["temperature", "lab"],
    lastSeenAt: new Date().toISOString(),
    isConnected: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-03-20T14:30:00Z",
  },
  {
    id: "dev-002",
    name: "Humidity Sensor B3",
    description: "Warehouse humidity tracker",
    type: "SENSOR" as DeviceType,
    status: "ONLINE" as DeviceStatus,
    organizationId: "org-001",
    serialNumber: "SN-HUM-003",
    location: "Warehouse B",
    firmwareVersion: "2.1.3",
    tags: ["humidity", "warehouse"],
    lastSeenAt: new Date(Date.now() - 300000).toISOString(),
    isConnected: true,
    createdAt: "2024-02-10T08:00:00Z",
    updatedAt: "2024-03-18T09:15:00Z",
  },
  {
    id: "dev-003",
    name: "Motion Detector C1",
    description: "Perimeter motion sensor",
    type: "SENSOR" as DeviceType,
    status: "OFFLINE" as DeviceStatus,
    organizationId: "org-001",
    serialNumber: "SN-MOT-001",
    location: "Perimeter Zone C",
    firmwareVersion: "1.8.2",
    tags: ["motion", "security"],
    // lastSeenAt is 1 day ago (86400000 ms = 24 hours) -- this device hasn't reported in a while
    lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
    isConnected: false,
    createdAt: "2024-01-20T12:00:00Z",
    updatedAt: "2024-03-15T16:45:00Z",
  },
  {
    id: "dev-004",
    name: "Smart Valve Actuator",
    description: "Water flow control valve",
    type: "ACTUATOR" as DeviceType,
    status: "ONLINE" as DeviceStatus,
    organizationId: "org-001",
    serialNumber: "SN-VAL-002",
    location: "Pump Station 1",
    firmwareVersion: "3.0.1",
    tags: ["valve", "water"],
    lastSeenAt: new Date(Date.now() - 60000).toISOString(),
    isConnected: true,
    createdAt: "2024-02-05T14:00:00Z",
    updatedAt: "2024-03-19T11:20:00Z",
  },
  {
    id: "dev-005",
    name: "Edge Gateway Alpha",
    description: "Main edge computing gateway",
    type: "GATEWAY" as DeviceType,
    status: "MAINTENANCE" as DeviceStatus,
    organizationId: "org-001",
    serialNumber: "SN-GW-001",
    location: "Server Room",
    firmwareVersion: "4.2.0",
    tags: ["gateway", "edge"],
    lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
    isConnected: false,
    createdAt: "2023-12-01T09:00:00Z",
    updatedAt: "2024-03-20T08:00:00Z",
  },
];

/**
 * DevicesPage - The device inventory/list page.
 *
 * State management:
 *   - search: text typed in the search box
 *   - statusFilter: selected device status (Online/Offline/Maintenance/All)
 *   - typeFilter: selected device type (Sensor/Actuator/Gateway/All)
 *
 * All three filters are combined to produce filteredDevices via useMemo,
 * which only re-computes when a filter actually changes.
 */
export default function DevicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Apply all three filters simultaneously.
  // useMemo ensures this only re-runs when search, statusFilter, or typeFilter changes,
  // not on every render (e.g., if the parent re-renders for unrelated reasons).
  const filteredDevices = useMemo(() => {
    return MOCK_DEVICES.filter((device) => {
      // Text search: matches against device name, serial number, or location.
      // It's case-insensitive so searching "temperature" matches "Temperature Sensor".
      const matchesSearch =
        !search ||
        device.name.toLowerCase().includes(search.toLowerCase()) ||
        device.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
        device.location?.toLowerCase().includes(search.toLowerCase());
      // Status filter: exact match or "all" to skip filtering
      const matchesStatus =
        statusFilter === "all" || device.status === statusFilter;
      // Type filter: exact match or "all" to skip filtering
      const matchesType = typeFilter === "all" || device.type === typeFilter;
      // All three must be true (AND logic)
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter]);

  // Navigation handler: clicking "View" on a device row navigates to its detail page.
  // useCallback prevents re-creating this function on every render.
  const handleViewDevice = useCallback(
    (id: string) => {
      router.push(`/devices/${id}`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
      {/* Page header with title, description, and action buttons */}
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
          {/* Export button: would trigger a CSV download in production */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          {/* Add Device button: navigates to the new device form */}
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push("/devices/new")}
          >
            Add Device
          </Button>
        </div>
      </div>

      {/* Filter bar: search input + two dropdown filters.
          On mobile, these stack vertically. On desktop, they sit in a row. */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Search input: takes up remaining space (flex-1) */}
        <div className="flex-1">
          <Input
            placeholder="Search devices by name, serial, or location..."
            prefixIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          {/* Status filter dropdown with a Filter icon inside it */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
          {/* Device type filter dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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

      {/* The device table: receives the already-filtered device list.
          The table component handles column rendering, sorting, and action buttons internally.
          onDelete currently does nothing (void id) -- would open a confirmation dialog in production. */}
      <DeviceTable
        devices={filteredDevices}
        onView={handleViewDevice}
        onEdit={(id) => router.push(`/devices/${id}`)}
        onDelete={(id) => {
          void id;
        }}
      />
    </div>
  );
}
