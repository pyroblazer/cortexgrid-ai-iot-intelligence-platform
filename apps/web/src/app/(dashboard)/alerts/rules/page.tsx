"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Input } from "@cortexgrid/ui/components/Input";
import { Modal } from "@cortexgrid/ui/components/Modal";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import { apiClient } from "@/lib/api-client";
import type { AlertSeverity } from "@cortexgrid/types";

interface AlertCondition {
  field: string;
  operator: string;
  threshold: number;
}

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  condition: AlertCondition;
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

const DEFAULT_FORM = {
  name: "",
  description: "",
  conditionField: "temperature",
  conditionOperator: "gt",
  conditionThreshold: 30,
  severity: "WARNING" as AlertSeverity,
};

export default function AlertRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const result = await apiClient.get<{ data: any[] }>("/alerts/rules");
      if (result?.data) {
        setRules(
          result.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? null,
            condition: r.condition ?? { field: "temperature", operator: "gt", threshold: 30 },
            severity: r.severity ?? "INFO",
            isActive: r.isActive ?? false,
            lastTriggeredAt: r.lastTriggeredAt ?? null,
            createdAt: r.createdAt,
          }))
        );
      }
    } catch {
      // Rules unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = useCallback(async (id: string, currentActive: boolean) => {
    try {
      await apiClient.patch(`/alerts/rules/${id}`, { isActive: !currentActive });
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
      );
    } catch {
      // Toggle failed
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedRule) return;
    try {
      await apiClient.delete(`/alerts/rules/${selectedRule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== selectedRule.id));
    } catch {
      // Delete failed
    }
    setDeleteModalOpen(false);
    setSelectedRule(null);
  }, [selectedRule]);

  const openCreateModal = useCallback(() => {
    setForm(DEFAULT_FORM);
    setCreateModalOpen(true);
  }, []);

  const openEditModal = useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      conditionField: rule.condition?.field ?? "temperature",
      conditionOperator: rule.condition?.operator ?? "gt",
      conditionThreshold: rule.condition?.threshold ?? 30,
      severity: rule.severity,
    });
    setEditModalOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      await apiClient.post("/alerts/rules", {
        name: form.name,
        description: form.description || undefined,
        condition: { field: form.conditionField, operator: form.conditionOperator, threshold: form.conditionThreshold },
        severity: form.severity,
      });
      setCreateModalOpen(false);
      setForm(DEFAULT_FORM);
      await fetchRules();
    } catch {
      // Create failed
    } finally {
      setSaving(false);
    }
  }, [form, fetchRules]);

  const handleEdit = useCallback(async () => {
    if (!editingRule) return;
    setSaving(true);
    try {
      await apiClient.patch(`/alerts/rules/${editingRule.id}`, {
        name: form.name,
        description: form.description || undefined,
        condition: { field: form.conditionField, operator: form.conditionOperator, threshold: form.conditionThreshold },
        severity: form.severity,
      });
      setEditModalOpen(false);
      setEditingRule(null);
      await fetchRules();
    } catch {
      // Edit failed
    } finally {
      setSaving(false);
    }
  }, [editingRule, form, fetchRules]);

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
        render: (row) => {
          const cond = row.condition;
          return (
            <code className="rounded bg-dark-100 px-2 py-1 font-mono text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300">
              {cond?.field ?? "?"} {OPERATOR_LABELS[cond?.operator] ?? cond?.operator ?? "?"} {cond?.threshold ?? "?"}
            </code>
          );
        },
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
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleToggle(row.id, row.isActive);
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
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                openEditModal(row);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
              title="Edit rule"
              aria-label="Edit rule"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e: React.MouseEvent) => {
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
    [handleToggle, openEditModal]
  );

  const renderFormFields = () => (
    <div className="space-y-4">
      <Input
        label="Rule Name"
        value={form.name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="e.g. High Temperature Alert"
      />
      <Input
        label="Description"
        value={form.description}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="What this rule detects"
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">Condition</label>
        <div className="flex gap-2">
          <select
            value={form.conditionField}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, conditionField: e.target.value }))}
            className="h-10 flex-1 rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
          >
            <option value="temperature">Temperature</option>
            <option value="humidity">Humidity</option>
            <option value="pressure">Pressure</option>
            <option value="battery">Battery</option>
            <option value="signal_strength">Signal Strength</option>
          </select>
          <select
            value={form.conditionOperator}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, conditionOperator: e.target.value }))}
            className="h-10 w-20 rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
          >
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="gte">&gt;=</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
            <option value="neq">!=</option>
          </select>
          <input
            type="number"
            value={form.conditionThreshold}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, conditionThreshold: Number(e.target.value) }))}
            className="h-10 w-24 rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">Severity</label>
        <select
          value={form.severity}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, severity: e.target.value as AlertSeverity }))}
          className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
        >
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>
      </div>
    </div>
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
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          Create Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rules}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="No alert rules configured"
        />
      )}

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Alert Rule"
        description={`Are you sure you want to delete "${selectedRule?.name}"? This action cannot be undone.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
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

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Alert Rule"
        description="Define a condition that triggers an alert when met"
        actions={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || saving}>
              {saving ? "Creating..." : "Create Rule"}
            </Button>
          </>
        }
      >
        {renderFormFields()}
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingRule(null); }}
        title="Edit Alert Rule"
        description="Update the alert rule configuration"
        actions={
          <>
            <Button variant="outline" onClick={() => { setEditModalOpen(false); setEditingRule(null); }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!form.name.trim() || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        {renderFormFields()}
      </Modal>
    </div>
  );
}
