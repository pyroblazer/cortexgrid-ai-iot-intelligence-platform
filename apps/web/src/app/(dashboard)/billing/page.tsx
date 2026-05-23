"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Download,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@cortexgrid/ui/components/Button";
import { Badge } from "@cortexgrid/ui/components/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@cortexgrid/ui/components/Card";
import { PlanCard } from "@/components/billing/plan-card";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { PlanType } from "@cortexgrid/types";

const PLAN_LIMITS = {
  FREE: { devices: 5, apiCalls: 1000, aiQueries: 50, storageMb: 100, teamMembers: 2 },
  PRO: { devices: 100, apiCalls: 100000, aiQueries: 5000, storageMb: 10000, teamMembers: 25 },
  ENTERPRISE: { devices: Infinity, apiCalls: Infinity, aiQueries: Infinity, storageMb: Infinity, teamMembers: Infinity },
};

interface Subscription {
  plan: PlanType;
  status: string;
  currentPeriodEnd?: string;
}

interface UsageRecord {
  id: string;
  type: string;
  quantity: number;
  timestamp: string;
}

const DEFAULT_USAGE = { devices: 0, apiCalls: 0, aiQueries: 0, storageMb: 0, teamMembers: 0 };

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const currentPlan = ((user as any)?.memberships?.[0]?.organization?.plan ?? "FREE") as PlanType;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState(DEFAULT_USAGE);
  const [invoices, setInvoices] = useState<UsageRecord[]>([]);
  const [, setLoading] = useState(true);

  const fetchBillingData = useCallback(async () => {
    try {
      const [subResult, usageResult] = await Promise.all([
        apiClient.get<Subscription>("/billing/subscription").catch(() => null),
        apiClient.get<{ data: any[] }>("/billing/usage?limit=6").catch(() => null),
      ]);

      if (subResult) {
        setSubscription(subResult);
      }

      if (usageResult?.data) {
        const usageArr = usageResult.data;
        if (Array.isArray(usageArr) && usageArr.length > 0) {
          const latest = usageArr[usageArr.length - 1];
          setUsage({
            devices: latest.quantity ?? latest.devices ?? 0,
            apiCalls: latest.apiCalls ?? 0,
            aiQueries: latest.aiQueries ?? 0,
            storageMb: latest.storageMb ?? 0,
            teamMembers: latest.teamMembers ?? 0,
          });
          setInvoices(usageArr);
        }
      }
    } catch {
      // Billing data unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const activePlan = subscription?.plan ?? currentPlan;

  const usagePercent = useMemo(() => {
    const limits = PLAN_LIMITS[activePlan] ?? PLAN_LIMITS.FREE;
    return {
      devices: limits.devices === Infinity ? 0 : Math.min(100, (usage.devices / limits.devices) * 100),
      apiCalls: limits.apiCalls === Infinity ? 0 : Math.min(100, (usage.apiCalls / limits.apiCalls) * 100),
      aiQueries: limits.aiQueries === Infinity ? 0 : Math.min(100, (usage.aiQueries / limits.aiQueries) * 100),
      storageMb: limits.storageMb === Infinity ? 0 : Math.min(100, (usage.storageMb / limits.storageMb) * 100),
    };
  }, [activePlan, usage]);

  const formatLimit = (value: number) => value === Infinity ? "Unlimited" : value.toLocaleString();

  const handleUpgrade = useCallback(async (plan: string) => {
    try {
      const result = await apiClient.post<{ sessionId: string; url: string }>("/billing/checkout", {
        plan,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start checkout");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Billing & Usage</h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">Manage your subscription plan and monitor usage</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              <Badge variant="info" size="sm">{activePlan}</Badge>
            </div>
            <CardDescription>Your current subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-3xl font-bold text-dark-900 dark:text-dark-50">
              {activePlan === "FREE" ? "$0" : activePlan === "PRO" ? "$29" : "$99"}
              <span className="text-lg font-normal text-dark-400">/mo</span>
            </div>

            <div className="space-y-4">
              {([
                { key: "devices", label: "Devices" },
                { key: "apiCalls", label: "API Calls" },
                { key: "aiQueries", label: "AI Queries" },
                { key: "storageMb", label: "Storage" },
              ] as const).map((item) => {
                const limits = PLAN_LIMITS[activePlan] ?? PLAN_LIMITS.FREE;
                return (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-600 dark:text-dark-400">{item.label}</span>
                      <span className="font-medium text-dark-900 dark:text-dark-100">
                        {usage[item.key].toLocaleString()} / {formatLimit(limits[item.key])}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usagePercent[item.key] >= 90 ? "bg-danger-500" : usagePercent[item.key] >= 70 ? "bg-warning-500" : "bg-primary-500"
                        }`}
                        style={{ width: `${Math.min(100, usagePercent[item.key])}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {activePlan !== "ENTERPRISE" && (
              <Button className="w-full" size="lg" onClick={() => handleUpgrade(activePlan === "FREE" ? "PRO" : "ENTERPRISE")}>
                <ArrowUpRight className="h-4 w-4" />
                Upgrade Plan
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Usage Over Time</CardTitle>
            <CardDescription>Monthly usage trends for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoices.length > 0 ? invoices : []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-dark-200 dark:stroke-dark-700" />
                  <XAxis dataKey="timestamp" className="text-xs" tick={{ fill: "rgb(107 114 128)" }} />
                  <YAxis className="text-xs" tick={{ fill: "rgb(107 114 128)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ backgroundColor: "rgb(255 255 255)", borderColor: "rgb(229 231 235)", borderRadius: "0.5rem", fontSize: "0.875rem" }} />
                  <Bar dataKey="quantity" name="Usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-dark-900 dark:text-dark-50">Available Plans</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <PlanCard
            plan={{
              type: "FREE",
              name: "Free",
              monthlyPrice: 0,
              features: ["Up to 5 IoT devices", "7-day data retention", "Basic telemetry dashboard", "Email alerts", "Community support"],
              limits: { devices: 5, teamMembers: 2, aiQueries: 50, storageMb: 100 },
            }}
            isCurrentPlan={activePlan === "FREE"}
            onSelect={() => {}}
          />
          <PlanCard
            plan={{
              type: "PRO",
              name: "Professional",
              monthlyPrice: 29,
              features: ["Up to 100 IoT devices", "90-day data retention", "Advanced analytics dashboard", "Custom alert rules", "MQTT & HTTP ingestion", "Webhook integrations", "Priority email support"],
              limits: { devices: 100, teamMembers: 25, aiQueries: 5000, storageMb: 10000 },
            }}
            isRecommended
            isCurrentPlan={activePlan === "PRO"}
            onSelect={() => handleUpgrade("PRO")}
          />
          <PlanCard
            plan={{
              type: "ENTERPRISE",
              name: "Enterprise",
              monthlyPrice: 99,
              features: ["Unlimited IoT devices", "Unlimited data retention", "AI-powered anomaly detection", "Custom ML model deployment", "Dedicated MQTT broker", "SSO & RBAC", "SLA-backed uptime guarantee", "Dedicated account manager"],
              limits: { devices: Infinity, teamMembers: Infinity, aiQueries: Infinity, storageMb: Infinity },
            }}
            isCurrentPlan={activePlan === "ENTERPRISE"}
            onSelect={() => handleUpgrade("ENTERPRISE")}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-dark-400">No billing history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-200 dark:border-dark-700">
                    <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">ID</th>
                    <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">Date</th>
                    <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">Type</th>
                    <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">Quantity</th>
                    <th className="pb-3 text-right font-medium text-dark-500 dark:text-dark-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-dark-100 dark:border-dark-800">
                      <td className="py-3 font-medium text-dark-900 dark:text-dark-100">{inv.id}</td>
                      <td className="py-3 text-dark-600 dark:text-dark-400">{new Date(inv.timestamp).toLocaleDateString()}</td>
                      <td className="py-3 text-dark-600 dark:text-dark-400">{inv.type}</td>
                      <td className="py-3 text-dark-900 dark:text-dark-100">{inv.quantity}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1/billing/invoices/${inv.id}/pdf`, {
                              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                            });
                            if (!res.ok) throw new Error("Download failed");
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `invoice-${inv.id}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Download failed");
                          }
                        }}><Download className="h-4 w-4" />Download</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
