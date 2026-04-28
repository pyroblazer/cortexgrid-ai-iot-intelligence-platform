"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Badge } from "@cortexgrid/ui/components/Badge";
import { Modal } from "@cortexgrid/ui/components/Modal";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import type { AlertSeverity } from "@cortexgrid/types";

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  severity: AlertSeverity;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

const SEVERITY_VARIANT: Record<AlertSeverity, "danger" | "warning" | "info"> = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "info",
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  eq: "=",
  neq: "!=",
};

const MOCK_RULES: AlertRule[] = [
  {
    id: "rule-001",
    name: "High Temperature Alert",
    description: "Triggers when temperature exceeds 30C",
    metric: "temperature",
    operator: "gt",
    threshold: 30,
    severity: "CRITICAL" as AlertSeverity,
    isActive: true,
    lastTriggeredAt: new Date(Date.now() - 300000).toISOString(),
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "rule-002",
    name: "Low Battery Warning",
    description: "Warn when battery drops below 15%",
    metric: "battery",
    operator: "lt",
    threshold: 15,
    severity: "WARNING" as AlertSeverity,
    isActive: true,
    lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: "2024-02-10T08:00:00Z",
  },
  {
    id: "rule-003",
    name: "Humidity Spike",
    description: "Alert on rapid humidity increase above 70%",
    metric: "humidity",
    operator: "gt",
    threshold: 70,
    severity: "WARNING" as AlertSeverity,
    isActive: false,
    lastTriggeredAt: null,
    createdAt: "2024-02-20T14:00:00Z",
  },
  {
    id: "rule-004",
    name: "Pressure Drop",
    description: "Detect significant pressure drops",
    metric: "pressure",
    operator: "lt",
    threshold: 980,
    severity: "INFO" as AlertSeverity,
    isActive: true,
    lastTriggeredAt: null,
    createdAt: "2024-03-01T09:00:00Z",
  },
];

export default function AlertRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AlertRule[]>(MOCK_RULES);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);

  const handleToggle = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedRule) {
      setRules((prev) => prev.filter((r) => r.id !== selectedRule.id));
      setDeleteModalOpen(false);
      setSelectedRule(null);
    }
  }, [selectedRule]);

  const columns: Column<AlertRule>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Rule Name",
        sortable: true,
        render: (row) => (
          <div>
            <p className="font-medium text-dark-900 dark:text-dark-100">
              {row.name}
            </p>
            {row.description && (
              <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">
                {row.description}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "condition",
        header: "Condition",
        render: (row) => (
          <code className="rounded bg-dark-100 px-2 py-1 font-mono text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300">
            {row.metric} {OPERATOR_LABELS[row.operator]} {row.threshold}
          </code>
        ),
      },
      {
        key: "severity",
        header: "Severity",
        render: (row) => (
          <Badge variant={SEVERITY_VARIANT[row.severity]} size="sm">
            {row.severity}
          </Badge>
        ),
      },
      {
        key: "isActive",
        header: "Status",
        render: (row) => (
          <Badge variant={row.isActive ? "success" : "default"} size="sm" dot>
            {row.isActive ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        key: "lastTriggeredAt",
        header: "Last Triggered",
        render: (row) => (
          <span className="text-sm text-dark-500 dark:text-dark-400">
            {row.lastTriggeredAt
              ? new Date(row.lastTriggeredAt).toLocaleString()
              : "Never"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(row.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
              title={row.isActive ? "Disable rule" : "Enable rule"}
              aria-label={row.isActive ? "Disable rule" : "Enable rule"}
            >
              {row.isActive ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
              title="Edit rule"
              aria-label="Edit rule"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRule(row);
                setDeleteModalOpen(true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20"
              title="Delete rule"
              aria-label="Delete rule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleToggle]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/alerts")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Alerts
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
            Alert Rules
          </h1>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            Configure rules that trigger alerts when conditions are met
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
          Create Rule
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rules}
        keyExtractor={(row) => row.id}
        pageSize={10}
        emptyMessage="No alert rules configured"
      />

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Alert Rule"
        description={`Are you sure you want to delete "${selectedRule?.name}"? This action cannot be undone.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Rule
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-900/20">
          <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400" />
          <p className="text-sm text-danger-700 dark:text-danger-300">
            This rule will be permanently removed. Any active alerts triggered
            by this rule will not be affected.
          </p>
        </div>
      </Modal>
    </div>
  );
}
