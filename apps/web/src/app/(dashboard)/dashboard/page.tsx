"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Cpu,
  Wifi,
  AlertTriangle,
  Database,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@cortexgrid/ui/components/Card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { AlertList } from "@/components/dashboard/alert-list";
import { apiClient } from "@/lib/api-client";

interface DeviceStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  maintenanceDevices: number;
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
}

export default function DashboardPage() {
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [devices, alerts] = await Promise.all([
        apiClient.get<DeviceStats>("/devices/stats"),
        apiClient.get<{ data: AlertStats[]; meta: { total: number } }>("/alerts?limit=1"),
      ]);
      setDeviceStats(devices);
      // Derive alert counts from the alerts list - the meta.total gives active count
      setAlertStats({
        total: alerts.meta?.total ?? 0,
        active: alerts.meta?.total ?? 0,
        acknowledged: 0,
        resolved: 0,
      });
    } catch {
      // Stats will remain null and cards show 0
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalDevices = deviceStats?.totalDevices ?? 0;
  const onlineDevices = deviceStats?.onlineDevices ?? 0;
  const offlineDevices = deviceStats?.offlineDevices ?? 0;
  const maintenanceDevices = deviceStats?.maintenanceDevices ?? 0;

  const pieData = [
    { name: "Online", value: onlineDevices, color: "#22c55e" },
    { name: "Offline", value: offlineDevices, color: "#ef4444" },
    { name: "Maintenance", value: maintenanceDevices, color: "#3b82f6" },
  ];

  const totalForBars = onlineDevices + offlineDevices + maintenanceDevices;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
          Overview of your IoT infrastructure
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Devices"
          value={totalDevices}
          icon={<Cpu className="h-5 w-5" />}
          color="primary"
        />
        <KpiCard
          title="Active Devices"
          value={onlineDevices}
          icon={<Wifi className="h-5 w-5" />}
          color="success"
        />
        <KpiCard
          title="Active Alerts"
          value={alertStats?.active ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="danger"
        />
        <KpiCard
          title="Devices Online"
          value={totalForBars > 0 ? Math.round((onlineDevices / totalForBars) * 100) : 0}
          icon={<Database className="h-5 w-5" />}
          color="accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TelemetryChart
            title="Real-Time Telemetry (Last 24h)"
            deviceId="all"
            metrics={["temperature", "humidity"]}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-500" />
              Device Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : totalForBars === 0 ? (
              <p className="py-8 text-center text-sm text-dark-400">
                No devices registered yet
              </p>
            ) : (
              <div className="space-y-4">
                {pieData.map((item) => {
                  const percentage = ((item.value / totalForBars) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-dark-700 dark:text-dark-300">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-dark-900 dark:text-dark-100">
                            {item.value}
                          </span>
                          <span className="text-dark-400">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AlertList limit={5} showViewAll />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/devices/new"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-dark-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
              >
                <Cpu className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  Add Device
                </span>
              </a>
              <a
                href="/alerts/rules"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-warning-300 hover:bg-warning-50 dark:border-dark-700 dark:hover:border-warning-700 dark:hover:bg-warning-900/20"
              >
                <AlertTriangle className="h-6 w-6 text-warning-600 dark:text-warning-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  Alert Rules
                </span>
              </a>
              <a
                href="/ai"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-dark-700 dark:hover:border-accent-700 dark:hover:bg-accent-900/20"
              >
                <ArrowUpRight className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  AI Assistant
                </span>
              </a>
              <a
                href="/billing"
                className="flex flex-col items-center gap-2 rounded-lg border border-dark-200 p-4 text-center transition-colors hover:border-success-300 hover:bg-success-50 dark:border-dark-700 dark:hover:border-success-700 dark:hover:bg-success-900/20"
              >
                <ArrowDownRight className="h-6 w-6 text-success-600 dark:text-success-400" />
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  View Plans
                </span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
