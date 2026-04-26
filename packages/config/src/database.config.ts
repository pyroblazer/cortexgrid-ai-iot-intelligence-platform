// ============================================================================
// Database Configuration
// ============================================================================

export interface DatabasePoolConfig {
  /** Minimum number of connections in the pool. */
  min: number;
  /** Maximum number of connections in the pool. */
  max: number;
  /** Time (ms) a connection may sit idle before being removed. */
  idleTimeoutMillis: number;
  /** Time (ms) to wait when acquiring a connection before timing out. */
  connectionTimeoutMillis: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  schema: string;
  pool: DatabasePoolConfig;
}

/**
 * Build a PostgreSQL connection string from individual parameters.
 *
 * Format: `postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=<mode>`
 */
export function buildConnectionString(config: DatabaseConfig): string {
  const sslMode = config.ssl ? 'require' : 'disable';
  return (
    `postgresql://${config.user}:${config.password}` +
    `@${config.host}:${config.port}/${config.database}` +
    `?sslmode=${sslMode}`
  );
}

/**
 * Default database pool configuration tuned for a typical Node.js service
 * running behind a connection-pool-aware proxy like PgBouncer.
 */
export const DEFAULT_POOL_CONFIG: DatabasePoolConfig = {
  min: 2,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

/**
 * Build a fully-resolved DatabaseConfig by merging environment values with
 * sensible defaults. Designed to be called at service startup.
 *
 * Expected environment variables:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL, DB_SCHEMA
 */
export function createDatabaseConfigFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): DatabaseConfig {
  return {
    host: env.DB_HOST ?? 'localhost',
    port: parseInt(env.DB_PORT ?? '5432', 10),
    user: env.DB_USER ?? 'cortexgrid',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'cortexgrid',
    ssl: env.DB_SSL === 'true',
    schema: env.DB_SCHEMA ?? 'public',
    pool: {
      min: parseInt(env.DB_POOL_MIN ?? String(DEFAULT_POOL_CONFIG.min), 10),
      max: parseInt(env.DB_POOL_MAX ?? String(DEFAULT_POOL_CONFIG.max), 10),
      idleTimeoutMillis: parseInt(
        env.DB_POOL_IDLE_TIMEOUT ?? String(DEFAULT_POOL_CONFIG.idleTimeoutMillis),
        10,
      ),
      connectionTimeoutMillis: parseInt(
        env.DB_POOL_CONNECT_TIMEOUT ?? String(DEFAULT_POOL_CONFIG.connectionTimeoutMillis),
        10,
      ),
    },
  };
}
