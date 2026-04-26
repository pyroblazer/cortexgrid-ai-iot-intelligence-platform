// ============================================================================
// Redis Configuration
// ============================================================================

export interface RedisConfig {
  /** Redis server hostname. */
  host: string;
  /** Redis server port. */
  port: number;
  /** Optional authentication password. */
  password?: string;
  /** Logical database index (0-15). */
  db: number;
  /** Default TTL (seconds) for cache entries when no explicit TTL is provided. */
  defaultTtlSeconds: number;
  /** Timeout (ms) for initial connection. */
  connectTimeoutMs: number;
  /** Maximum number of retry attempts on connection failure. */
  maxRetries: number;
  /** Enable / disable TLS for the connection. */
  tls: boolean;
}

// ---------------------------------------------------------------------------
// Pub/Sub Channel Names
// ---------------------------------------------------------------------------

export const REDIS_CHANNELS = {
  /** Published whenever a new telemetry batch is persisted. */
  TELEMETRY_RECEIVED: 'cortexgrid:telemetry:received',
  /** Published when an alert rule evaluation triggers. */
  ALERT_TRIGGERED: 'cortexgrid:alerts:triggered',
  /** Published when a device transitions online / offline. */
  DEVICE_STATUS_CHANGED: 'cortexgrid:devices:status',
  /** Published on plan-limit or billing events. */
  PLAN_EVENT: 'cortexgrid:billing:event',
} as const;

// ---------------------------------------------------------------------------
// Cache Key Prefixes
// ---------------------------------------------------------------------------

export const REDIS_KEY_PREFIXES = {
  /** Per-device latest telemetry snapshot. */
  DEVICE_LATEST_TELEMETRY: 'cortexgrid:telemetry:latest',
  /** Rate-limit counters. */
  RATE_LIMIT: 'cortexgrid:ratelimit',
  /** Session store. */
  SESSION: 'cortexgrid:session',
  /** API response cache. */
  API_CACHE: 'cortexgrid:cache:api',
} as const;

// ---------------------------------------------------------------------------
// Defaults & Factory
// ---------------------------------------------------------------------------

export const DEFAULT_REDIS_CONFIG: RedisConfig = {
  host: 'localhost',
  port: 6379,
  db: 0,
  defaultTtlSeconds: 300,
  connectTimeoutMs: 5_000,
  maxRetries: 3,
  tls: false,
};

/**
 * Build a RedisConfig by merging environment variables with defaults.
 *
 * Expected environment variables:
 *   REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB,
 *   REDIS_TLS, REDIS_DEFAULT_TTL, REDIS_CONNECT_TIMEOUT, REDIS_MAX_RETRIES
 */
export function createRedisConfigFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): RedisConfig {
  return {
    host: env.REDIS_HOST ?? DEFAULT_REDIS_CONFIG.host,
    port: parseInt(env.REDIS_PORT ?? String(DEFAULT_REDIS_CONFIG.port), 10),
    password: env.REDIS_PASSWORD ?? undefined,
    db: parseInt(env.REDIS_DB ?? String(DEFAULT_REDIS_CONFIG.db), 10),
    defaultTtlSeconds: parseInt(
      env.REDIS_DEFAULT_TTL ?? String(DEFAULT_REDIS_CONFIG.defaultTtlSeconds),
      10,
    ),
    connectTimeoutMs: parseInt(
      env.REDIS_CONNECT_TIMEOUT ?? String(DEFAULT_REDIS_CONFIG.connectTimeoutMs),
      10,
    ),
    maxRetries: parseInt(
      env.REDIS_MAX_RETRIES ?? String(DEFAULT_REDIS_CONFIG.maxRetries),
      10,
    ),
    tls: env.REDIS_TLS === 'true',
  };
}
