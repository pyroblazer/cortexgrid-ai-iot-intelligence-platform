// ============================================================================
// Application Configuration
// ============================================================================

/**
 * API version used in route prefixes and response headers.
 */
export const API_VERSION = 'v1';

/**
 * Default number of items returned per page in paginated responses.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum number of items allowed per page request.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Sliding window duration (ms) for general-purpose rate limiting.
 */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Maximum number of requests allowed within the rate-limit window.
 */
export const RATE_LIMIT_MAX_REQUESTS = 100;

// ---------------------------------------------------------------------------
// MQTT Topics
// ---------------------------------------------------------------------------

export const MQTT_TOPICS = {
  /** Incoming device telemetry payloads. */
  DEVICES_TELEMETRY: 'devices/+/telemetry',
  /** Device online / offline heartbeat. */
  DEVICES_STATUS: 'devices/+/status',
  /** Commands pushed from the cloud to a specific device. */
  DEVICES_COMMANDS: 'devices/+/commands',
  /** System-wide alert broadcast. */
  ALERTS: 'alerts/#',
} as const;

// ---------------------------------------------------------------------------
// Telemetry Aggregation
// ---------------------------------------------------------------------------

export const TELEMETRY_AGGREGATION_INTERVALS = {
  /** 1-minute raw bucket. */
  MINUTE: 60_000,
  /** 1-hour summary bucket. */
  HOUR: 3_600_000,
  /** 1-day summary bucket. */
  DAY: 86_400_000,
} as const;

// ---------------------------------------------------------------------------
// Subscription Plan Limits
// ---------------------------------------------------------------------------

export const PLAN_LIMITS = {
  FREE: {
    maxDevices: 5,
    maxDataRetentionDays: 7,
    maxAlertsPerDay: 50,
    maxApiCallsPerDay: 1_000,
  },
  PRO: {
    maxDevices: 100,
    maxDataRetentionDays: 90,
    maxAlertsPerDay: 5_000,
    maxApiCallsPerDay: 100_000,
  },
  ENTERPRISE: {
    maxDevices: Infinity,
    maxDataRetentionDays: Infinity,
    maxAlertsPerDay: Infinity,
    maxApiCallsPerDay: Infinity,
  },
} as const;

// ---------------------------------------------------------------------------
// Subscription Plans (full details)
// ---------------------------------------------------------------------------

export type PlanId = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: readonly string[];
  limits: typeof PLAN_LIMITS[PlanId];
}

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
    },
    features: [
      'Up to 5 IoT devices',
      '7-day data retention',
      'Basic telemetry dashboard',
      'Email alerts',
      'Community support',
    ],
    limits: PLAN_LIMITS.FREE,
  },
  PRO: {
    id: 'PRO',
    name: 'Professional',
    price: {
      monthly: 29,
      yearly: 290,
      currency: 'USD',
    },
    features: [
      'Up to 100 IoT devices',
      '90-day data retention',
      'Advanced analytics dashboard',
      'Custom alert rules',
      'MQTT & HTTP ingestion',
      'Webhook integrations',
      'Priority email support',
    ],
    limits: PLAN_LIMITS.PRO,
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: {
      monthly: 99,
      yearly: 990,
      currency: 'USD',
    },
    features: [
      'Unlimited IoT devices',
      'Unlimited data retention',
      'AI-powered anomaly detection',
      'Custom ML model deployment',
      'Dedicated MQTT broker',
      'SSO & RBAC',
      'SLA-backed uptime guarantee',
      'Dedicated account manager',
      'Phone & video support',
    ],
    limits: PLAN_LIMITS.ENTERPRISE,
  },
} as const;
