// ============================================================================
// CortexGrid Alert Types
// ============================================================================

/**
 * Severity level indicating the urgency of an alert.
 */
export enum AlertSeverity {
  /** Immediate attention required, potential system failure or safety issue */
  CRITICAL = "CRITICAL",
  /** Issue detected that should be investigated soon */
  WARNING = "WARNING",
  /** Informational notice, no immediate action required */
  INFO = "INFO",
}

/**
 * Current lifecycle status of an alert.
 */
export enum AlertStatus {
  /** Alert is active and has not been reviewed */
  ACTIVE = "ACTIVE",
  /** Alert has been reviewed but not yet resolved */
  ACKNOWLEDGED = "ACKNOWLEDGED",
  /** Alert has been resolved and is no longer active */
  RESOLVED = "RESOLVED",
}

/**
 * Defines a rule that triggers alerts based on telemetry conditions.
 */
export interface AlertRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Description of what this rule monitors */
  description?: string;
  /** The organization this rule belongs to */
  organizationId: string;
  /** Device IDs this rule applies to (empty means all devices) */
  deviceIds?: string[];
  /** Metric name to evaluate (e.g. "temperature") */
  metric: string;
  /** Comparison operator for the condition */
  condition: AlertCondition;
  /** Severity level when this rule triggers */
  severity: AlertSeverity;
  /** Whether the rule is currently active */
  enabled: boolean;
  /** Minimum time between repeated alerts from this rule (in seconds) */
  cooldownPeriod?: number;
  /** Notification channel IDs to notify when triggered */
  notificationChannelIds?: string[];
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Condition that defines when an alert rule triggers.
 */
export interface AlertCondition {
  /** Comparison operator */
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  /** Threshold value to compare against */
  threshold: number;
  /** How long the condition must persist before triggering (e.g. "5m") */
  duration?: string;
}

/**
 * Data transfer object for creating a new alert rule.
 */
export interface CreateAlertRuleDto {
  /** Human-readable rule name */
  name: string;
  /** Description of the rule */
  description?: string;
  /** Device IDs to apply this rule to */
  deviceIds?: string[];
  /** Metric name to evaluate */
  metric: string;
  /** Trigger condition */
  condition: AlertCondition;
  /** Severity level */
  severity: AlertSeverity;
  /** Whether the rule should be active immediately */
  enabled?: boolean;
  /** Cooldown period in seconds */
  cooldownPeriod?: number;
  /** Notification channel IDs */
  notificationChannelIds?: string[];
}

/**
 * Data transfer object for updating an alert rule.
 */
export interface UpdateAlertRuleDto {
  /** Updated rule name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated device IDs */
  deviceIds?: string[];
  /** Updated metric name */
  metric?: string;
  /** Updated condition */
  condition?: AlertCondition;
  /** Updated severity */
  severity?: AlertSeverity;
  /** Enable or disable the rule */
  enabled?: boolean;
  /** Updated cooldown period */
  cooldownPeriod?: number;
  /** Updated notification channel IDs */
  notificationChannelIds?: string[];
}

/**
 * An alert instance triggered by an alert rule.
 */
export interface Alert {
  /** Unique alert identifier */
  id: string;
  /** The alert rule that triggered this alert */
  ruleId: string;
  /** The rule name at the time of triggering */
  ruleName: string;
  /** The organization this alert belongs to */
  organizationId: string;
  /** The device that caused this alert */
  deviceId: string;
  /** The device name at the time of alerting */
  deviceName: string;
  /** The metric that triggered the alert */
  metric: string;
  /** The value that breached the threshold */
  triggerValue: number;
  /** The threshold that was breached */
  thresholdValue: number;
  /** Severity level of this alert */
  severity: AlertSeverity;
  /** Current status of the alert */
  status: AlertStatus;
  /** The user who acknowledged the alert, if applicable */
  acknowledgedBy?: string;
  /** Timestamp when the alert was acknowledged */
  acknowledgedAt?: string;
  /** The user who resolved the alert, if applicable */
  resolvedBy?: string;
  /** Timestamp when the alert was resolved */
  resolvedAt?: string;
  /** Optional resolution notes */
  resolutionNotes?: string;
  /** Timestamp when the alert was triggered */
  triggeredAt: string;
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Data transfer object for acknowledging or resolving an alert.
 */
export interface UpdateAlertDto {
  /** New status to set */
  status: AlertStatus;
  /** Optional notes explaining the resolution */
  resolutionNotes?: string;
}

/**
 * Summary statistics for alerts within an organization.
 */
export interface AlertStats {
  /** Total number of alerts */
  total: number;
  /** Number of currently active alerts */
  active: number;
  /** Number of acknowledged alerts */
  acknowledged: number;
  /** Number of resolved alerts */
  resolved: number;
  /** Breakdown by severity */
  bySeverity: Record<AlertSeverity, number>;
}

/**
 * All alert-related types are exported directly from this module.
 * Use `import { AlertSeverity, AlertStatus, ... } from "@cortexgrid/types"` to access them.
 */
