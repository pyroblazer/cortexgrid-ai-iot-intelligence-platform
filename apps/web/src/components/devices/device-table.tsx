/**
 * Device Table Component (components/devices/device-table.tsx)
 *
 * WHAT: A reusable data table that displays a list of IoT devices with their status,
 *       name, type, location, last seen time, and action buttons (view/edit/delete).
 *
 * WHY IT EXISTS: The devices page needs to show all devices in a structured table format
 *               with sorting, custom cell rendering, and row-level action buttons.
 *               This component encapsulates all the column definitions and cell renderers
 *               so the devices page can just pass in data and callback functions.
 *
 * Data table features:
 *   - Custom cell rendering: each column has a render function that returns JSX
 *     (e.g., status shows a colored dot, type shows a badge, last seen shows relative time)
 *   - Sortable columns: "Device", "Type", and "Last Seen" columns can be sorted
 *     (the DataTable parent component handles the actual sorting logic)
 *   - Action buttons: View (eye icon), Edit (pencil icon), Delete (trash icon)
 *     each call a callback function passed from the parent page
 *   - Empty state: shows a helpful message when no devices match the current filters
 *   - Pagination: shows 10 devices per page via the DataTable's built-in pagination
 *
 * Data flow:
 *   Parent page -> devices array + callbacks (onView, onEdit, onDelete) -> this component
 *   -> DataTable (generic reusable table) with column definitions
 *
 * Column definitions use useMemo to prevent re-creating the column array on every render.
 * The dependency array includes the callbacks so columns stay in sync with the parent.
 */

"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, Eye } from "lucide-react";
import { Badge } from "@cortexgrid/ui/components/Badge";
import { StatusIndicator } from "@cortexgrid/ui/components/StatusIndicator";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import type { DeviceResponse } from "@cortexgrid/types";

// Human-readable labels for device type codes.
// IoT devices are categorized into three types:
// - SENSOR: reads data from the environment (temperature, humidity, motion)
// - ACTUATOR: does something in the physical world (opens a valve, turns on a motor)
// - GATEWAY: routes data between devices and the cloud (like a WiFi router for IoT)
const TYPE_LABELS: Record<string, string> = {
  SENSOR: "Sensor",
  ACTUATOR: "Actuator",
  GATEWAY: "Gateway",
};

/** Props for the DeviceTable component */
interface DeviceTableProps {
  devices: DeviceResponse[];       // The array of devices to display
  onView: (id: string) => void;    // Callback when user clicks "View" on a device
  onEdit: (id: string) => void;    // Callback when user clicks "Edit" on a device
  onDelete: (id: string) => void;  // Callback when user clicks "Delete" on a device
}

/**
 * DeviceTable - Renders a list of devices in a structured table with actions.
 *
 * @param devices - The filtered list of devices to show
 * @param onView - Navigation handler for viewing device details
 * @param onEdit - Navigation handler for editing a device
 * @param onDelete - Handler for deleting a device (should show a confirmation dialog)
 */
export function DeviceTable({
  devices,
  onView,
  onEdit,
  onDelete,
}: DeviceTableProps) {
  // Column definitions: each object defines one column in the table.
  // useMemo prevents re-creating these on every render.
  // Dependencies include the callbacks so action buttons always call the latest versions.
  const columns: Column<DeviceResponse>[] = useMemo(
    () => [
      {
        key: "status",
        header: "Status",
        // Status column: shows a colored dot indicator (green=online, red=offline, yellow=maintenance)
        // The StatusIndicator component handles the visual styling based on the status string.
        render: (row) => (
          <StatusIndicator
            status={
              row.status === "ONLINE"
                ? "online"
                : row.status === "OFFLINE"
                ? "offline"
                : "maintenance"
            }
            label={row.status}
          />
        ),
      },
      {
        key: "name",
        header: "Device",
        sortable: true,
        // Device column: shows the device name (bold) and description (lighter, truncated).
        // line-clamp-1 ensures long descriptions don't push the table row height.
        render: (row) => (
          <div>
            <p className="font-medium text-dark-900 dark:text-dark-100">
              {row.name}
            </p>
            {row.description && (
              <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400 line-clamp-1">
                {row.description}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        // Type column: shows the device type as a small badge (e.g., "Sensor", "Actuator")
        render: (row) => (
          <Badge variant="default" size="sm">
            {TYPE_LABELS[row.type] ?? row.type}
          </Badge>
        ),
      },
      {
        key: "location",
        header: "Location",
        // Location column: shows the physical location, or "N/A" if not set
        render: (row) => (
          <span className="text-sm text-dark-600 dark:text-dark-400">
            {row.location ?? "N/A"}
          </span>
        ),
      },
      {
        key: "lastSeenAt",
        header: "Last Seen",
        sortable: true,
        // Last Seen column: shows relative time (e.g., "5 minutes ago", "2 hours ago").
        // Uses date-fns formatDistanceToNow for human-friendly time formatting.
        // If lastSeenAt is null, shows "Never" (the device has never connected).
        render: (row) => (
          <span className="text-sm text-dark-500 dark:text-dark-400">
            {row.lastSeenAt
              ? formatDistanceToNow(new Date(row.lastSeenAt), {
                  addSuffix: true,
                })
              : "Never"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        // Actions column: three icon buttons for View, Edit, and Delete.
        // stopPropagation prevents the row click handler from also firing
        // when clicking an action button (important if the DataTable has row click behavior).
        render: (row) => (
          <div className="flex items-center gap-1">
            {/* View button: opens the device detail page */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-400 hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-800 dark:hover:text-dark-300"
              title="View details"
              aria-label={`View ${row.name}`}
            >
              <Eye className="h-4 w-4" />
            </button>
            {/* Edit button: opens the device edit form */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-400 hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-800 dark:hover:text-dark-300"
              title="Edit device"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {/* Delete button: styled with danger colors on hover to signal a destructive action.
                In production, this should trigger a confirmation dialog before actually deleting. */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20 dark:hover:text-danger-400"
              title="Delete device"
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [onView, onEdit, onDelete]
  );

  // Render the generic DataTable with our device-specific column definitions.
  // keyExtractor tells the table how to uniquely identify each row (by device ID).
  // pageSize=10 means the table shows 10 devices per page with pagination controls.
  return (
    <DataTable
      columns={columns}
      data={devices}
      keyExtractor={(row) => row.id}
      pageSize={10}
      emptyMessage="No devices found. Add your first device to get started."
    />
  );
}
