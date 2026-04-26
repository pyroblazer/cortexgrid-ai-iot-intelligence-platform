/**
 * Billing Page (app/(dashboard)/billing/page.tsx)
 *
 * WHAT: The subscription and usage management page. Shows the user's current plan,
 *       how much of each resource they've used, available plans to upgrade to,
 *       monthly usage trends, and billing history (invoices).
 *
 * WHY IT EXISTS: CortexGrid is a SaaS product with tiered pricing. Users need to:
 *               - See how close they are to their plan limits
 *               - Understand what they'd gain by upgrading
 *               - Download past invoices for accounting
 *
 * Stripe integration flow (how payments work):
 *   1. User clicks "Upgrade Plan" on a plan card
 *   2. Frontend calls the backend which creates a Stripe Checkout Session
 *   3. User is redirected to Stripe's hosted payment page
 *   4. After payment, Stripe sends a webhook to the backend
 *   5. Backend updates the user's plan in the database
 *   6. User is redirected back to this billing page with the new plan active
 *
 * Layout structure (top to bottom):
 *   1. Current Plan card (1/3) + Usage Over Time bar chart (2/3)
 *   2. Available Plans row: Free, Professional, Enterprise cards side by side
 *   3. Billing History table: past invoices with download links
 *
 * Usage percentage calculation:
 *   - For each resource (devices, API calls, etc.), we calculate:
 *     (current usage / plan limit) * 100, capped at 100%
 *   - Progress bars change color: blue < 70%, yellow 70-90%, red > 90%
 */

"use client";

import { useMemo } from "react";
import {
  CreditCard,
  Download,
  ArrowUpRight,
  Check,
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
import type { PlanType } from "@cortexgrid/types";

// The user's current subscription plan. In production, this comes from the auth store or API.
const CURRENT_PLAN: PlanType = "FREE" as PlanType;

// Monthly usage data for the bar chart. Shows trends over the last 6 months.
const USAGE_DATA = [
  { month: "Oct", devices: 28, apiCalls: 42000, storage: 120 },
  { month: "Nov", devices: 35, apiCalls: 58000, storage: 180 },
  { month: "Dec", devices: 41, apiCalls: 71000, storage: 240 },
  { month: "Jan", devices: 45, apiCalls: 68000, storage: 310 },
  { month: "Feb", devices: 48, apiCalls: 82000, storage: 380 },
  { month: "Mar", devices: 52, apiCalls: 95000, storage: 420 },
];

// Past invoices for the billing history table. In production, fetched from Stripe via API.
const INVOICES = [
  { id: "INV-001", date: "2024-03-01", amount: "$0.00", status: "Paid" },
  { id: "INV-002", date: "2024-02-01", amount: "$0.00", status: "Paid" },
  { id: "INV-003", date: "2024-01-01", amount: "$0.00", status: "Paid" },
];

// Plan limits define the maximum resources allowed for each subscription tier.
// Enterprise uses Infinity (unlimited) for all resources.
const PLAN_LIMITS = {
  FREE: { devices: 5, apiCalls: 1000, aiQueries: 50, storageMb: 100, teamMembers: 2 },
  PRO: { devices: 100, apiCalls: 100000, aiQueries: 5000, storageMb: 10000, teamMembers: 25 },
  ENTERPRISE: { devices: Infinity, apiCalls: Infinity, aiQueries: Infinity, storageMb: Infinity, teamMembers: Infinity },
};

// The organization's current resource usage. Compared against plan limits to show progress bars.
const CURRENT_USAGE = {
  devices: 52,
  apiCalls: 95000,
  aiQueries: 42,
  storageMb: 420,
  teamMembers: 4,
};

/**
 * BillingPage - Subscription and usage management.
 *
 * The usagePercent calculation is the key piece of logic here:
 * it computes how much of each plan limit has been consumed,
 * capping at 100% so the progress bar doesn't overflow.
 */
export default function BillingPage() {
  // Calculate usage percentages for each resource.
  // Math.min(100, ...) prevents the bar from exceeding 100% even if usage exceeds the limit.
  const usagePercent = useMemo(() => {
    const limits = PLAN_LIMITS[CURRENT_PLAN];
    return {
      devices: Math.min(100, (CURRENT_USAGE.devices / limits.devices) * 100),
      apiCalls: Math.min(100, (CURRENT_USAGE.apiCalls / limits.apiCalls) * 100),
      aiQueries: Math.min(100, (CURRENT_USAGE.aiQueries / limits.aiQueries) * 100),
      storageMb: Math.min(100, (CURRENT_USAGE.storageMb / limits.storageMb) * 100),
    };
  }, []);

  // Helper to display plan limits nicely. "Infinity" becomes "Unlimited" for display.
  const formatLimit = (value: number) =>
    value === Infinity ? "Unlimited" : value.toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          Billing & Usage
        </h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
          Manage your subscription plan and monitor usage
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              <Badge variant="info" size="sm">
                Free
              </Badge>
            </div>
            <CardDescription>
              Your current subscription details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-3xl font-bold text-dark-900 dark:text-dark-50">
              $0<span className="text-lg font-normal text-dark-400">/mo</span>
            </div>

            <div className="space-y-4">
              {(
                [
                  { key: "devices", label: "Devices" },
                  { key: "apiCalls", label: "API Calls" },
                  { key: "aiQueries", label: "AI Queries" },
                  { key: "storageMb", label: "Storage" },
                ] as const
              ).map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-600 dark:text-dark-400">
                      {item.label}
                    </span>
                    <span className="font-medium text-dark-900 dark:text-dark-100">
                      {CURRENT_USAGE[item.key].toLocaleString()} /{" "}
                      {formatLimit(PLAN_LIMITS[CURRENT_PLAN][item.key])}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePercent[item.key] >= 90
                          ? "bg-danger-500"
                          : usagePercent[item.key] >= 70
                          ? "bg-warning-500"
                          : "bg-primary-500"
                      }`}
                      style={{ width: `${Math.min(100, usagePercent[item.key])}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full" size="lg">
              <ArrowUpRight className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Usage Over Time</CardTitle>
            <CardDescription>
              Monthly usage trends for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={USAGE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-dark-200 dark:stroke-dark-700" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: "rgb(107 114 128)" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "rgb(107 114 128)" }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgb(255 255 255)",
                      borderColor: "rgb(229 231 235)",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  />
                  <Bar dataKey="apiCalls" name="API Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="devices" name="Devices" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-dark-900 dark:text-dark-50">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <PlanCard
            planId="FREE"
            name="Free"
            price={0}
            yearlyPrice={0}
            features={[
              "Up to 5 IoT devices",
              "7-day data retention",
              "Basic telemetry dashboard",
              "Email alerts",
              "Community support",
            ]}
            isCurrentPlan={CURRENT_PLAN === "FREE"}
            onSelect={() => {}}
          />
          <PlanCard
            planId="PRO"
            name="Professional"
            price={29}
            yearlyPrice={290}
            features={[
              "Up to 100 IoT devices",
              "90-day data retention",
              "Advanced analytics dashboard",
              "Custom alert rules",
              "MQTT & HTTP ingestion",
              "Webhook integrations",
              "Priority email support",
            ]}
            isPopular
            isCurrentPlan={CURRENT_PLAN === "PRO"}
            onSelect={() => {}}
          />
          <PlanCard
            planId="ENTERPRISE"
            name="Enterprise"
            price={99}
            yearlyPrice={990}
            features={[
              "Unlimited IoT devices",
              "Unlimited data retention",
              "AI-powered anomaly detection",
              "Custom ML model deployment",
              "Dedicated MQTT broker",
              "SSO & RBAC",
              "SLA-backed uptime guarantee",
              "Dedicated account manager",
            ]}
            isCurrentPlan={CURRENT_PLAN === "ENTERPRISE"}
            onSelect={() => {}}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">
                    Invoice
                  </th>
                  <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">
                    Date
                  </th>
                  <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">
                    Amount
                  </th>
                  <th className="pb-3 text-left font-medium text-dark-500 dark:text-dark-400">
                    Status
                  </th>
                  <th className="pb-3 text-right font-medium text-dark-500 dark:text-dark-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-dark-100 dark:border-dark-800"
                  >
                    <td className="py-3 font-medium text-dark-900 dark:text-dark-100">
                      {invoice.id}
                    </td>
                    <td className="py-3 text-dark-600 dark:text-dark-400">
                      {invoice.date}
                    </td>
                    <td className="py-3 text-dark-900 dark:text-dark-100">
                      {invoice.amount}
                    </td>
                    <td className="py-3">
                      <Badge variant="success" size="sm">
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
