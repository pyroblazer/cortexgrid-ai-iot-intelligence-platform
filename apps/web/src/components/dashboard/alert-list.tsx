"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ShieldAlert,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@cortexgrid/ui/components/Badge";
import { Button } from "@cortexgrid/ui/components/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@cortexgrid/ui/components/Card";
import type { AlertSeverity } from "@cortexgrid/types";

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  deviceName: string;
  createdAt: string;
}

const MOCK_ALERTS: AlertItem[] = [
  {
    id: "alert-001",
    title: "High Temperature Detected",
    message: "Temperature exceeded threshold of 30C (current: 35.2C)",
    severity: "CRITICAL" as AlertSeverity,
    deviceName: "Temperature Sensor A1",
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "alert-002",
    title: "Device Offline",
    message: "Motion Detector C1 has been offline for over 1 hour",
    severity: "WARNING" as AlertSeverity,
    deviceName: "Motion Detector C1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "alert-003",
    title: "Low Battery Warning",
    message: "Battery level below 15% (current: 12.3%)",
    severity: "WARNING" as AlertSeverity,
    deviceName: "Edge Gateway Alpha",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "alert-004",
    title: "Firmware Update Available",
    message: "New firmware version 2.2.0 available",
    severity: "INFO" as AlertSeverity,
    deviceName: "Temperature Sensor A1",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "alert-005",
    title: "Humidity Spike",
    message: "Humidity jumped from 45% to 78% in 5 minutes",
    severity: "CRITICAL" as AlertSeverity,
    deviceName: "Humidity Sensor B3",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { variant: "danger" | "warning" | "info"; icon: typeof AlertTriangle; border: string }
> = {
  CRITICAL: {
    variant: "danger",
    icon: ShieldAlert,
    border: "border-l-danger-500",
  },
  WARNING: {
    variant: "warning",
    icon: AlertTriangle,
    border: "border-l-warning-500",
  },
  INFO: {
    variant: "info",
    icon: Bell,
    border: "border-l-primary-500",
  },
};

interface AlertListProps {
  limit?: number;
  deviceId?: string;
  showViewAll?: boolean;
}

export function AlertList({
  limit = 5,
  deviceId,
  showViewAll = false,
}: AlertListProps) {
  const alerts = useMemo(() => {
    let filtered = MOCK_ALERTS;
    if (deviceId) {
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(deviceId.toLowerCase())
      );
    }
    return filtered.slice(0, limit);
  }, [limit, deviceId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-500" />
          Recent Alerts
        </CardTitle>
        {showViewAll && (
          <Link href="/alerts">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-dark-500 dark:text-dark-400">
            No recent alerts
          </div>
        ) : (
          <div className="divide-y divide-dark-100 dark:divide-dark-800">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 border-l-4 py-3 pl-4 ${config.border}`}
                >
                  <div className="mt-0.5">
                    <Icon className="h-4 w-4 text-dark-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-dark-900 dark:text-dark-100">
                        {alert.title}
                      </p>
                      <Badge variant={config.variant} size="sm">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400 line-clamp-1">
                      {alert.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-dark-400">
                      <span>{alert.deviceName}</span>
                      <span>
                        {formatDistanceToNow(new Date(alert.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
