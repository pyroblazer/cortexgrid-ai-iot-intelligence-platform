// ============================================================================
// CortexGrid Telemetry Types
// ============================================================================

/**
 * Supported aggregation methods for telemetry data queries.
 */
export enum AggregationType {
  /** Average of all values in the interval */
  AVG = "AVG",
  /** Minimum value in the interval */
  MIN = "MIN",
  /** Maximum value in the interval */
  MAX = "MAX",
  /** Sum of all values in the interval */
  SUM = "SUM",
  /** Count of data points in the interval */
  COUNT = "COUNT",
  /** No aggregation, return raw data points */
  NONE = "NONE",
}

/**
 * Represents a time range for querying telemetry data.
 * Supports both absolute timestamps and relative durations.
 */
export interface TimeRange {
  /** Start of the time range as ISO 8601 string */
  start: string;
  /** End of the time range as ISO 8601 string */
  end: string;
}

/**
 * A single telemetry data point recorded from a device sensor.
 */
export interface TelemetryDataPoint {
  /** Unique identifier for this data point */
  id: string;
  /** The device that produced this reading */
  deviceId: string;
  /** The organization that owns the device */
  organizationId: string;
  /** Name of the metric or sensor channel (e.g. "temperature", "humidity") */
  metric: string;
  /** The measured value */
  value: number;
  /** Unit of measurement (e.g. "celsius", "percent", "hPa") */
  unit?: string;
  /** Timestamp when the reading was taken, as ISO 8601 string */
  timestamp: string;
  /** Additional key-value metadata for this data point */
  metadata?: Record<string, unknown>;
}

/**
 * Query parameters for retrieving telemetry data.
 */
export interface TelemetryQuery {
  /** Device IDs to filter by */
  deviceIds?: string[];
  /** Metric names to filter by */
  metrics?: string[];
  /** Time range for the query */
  timeRange: TimeRange;
  /** Aggregation method to apply */
  aggregation?: AggregationType;
  /** Aggregation interval duration (e.g. "5m", "1h", "1d") */
  interval?: string;
  /** Maximum number of data points to return */
  limit?: number;
  /** Sort order for results: "asc" or "desc" by timestamp */
  order?: "asc" | "desc";
}

/**
 * An aggregated telemetry bucket produced by a query with aggregation.
 */
export interface TelemetryBucket {
  /** Start of the bucket time window */
  start: string;
  /** End of the bucket time window */
  end: string;
  /** Aggregated value */
  value: number;
  /** Number of raw data points in this bucket */
  count: number;
  /** Minimum value within the bucket */
  min?: number;
  /** Maximum value within the bucket */
  max?: number;
}

/**
 * Response containing telemetry data matching a query.
 */
export interface TelemetryResponse {
  /** The device ID these results belong to */
  deviceId: string;
  /** The metric name for these results */
  metric: string;
  /** The organization ID */
  organizationId: string;
  /** Raw data points (returned when aggregation is NONE) */
  dataPoints?: TelemetryDataPoint[];
  /** Aggregated buckets (returned when aggregation is not NONE) */
  buckets?: TelemetryBucket[];
  /** The time range covered by this response */
  timeRange: TimeRange;
  /** Total number of matching records */
  total: number;
  /** Whether there are more results available */
  hasMore: boolean;
}

/**
 * Live telemetry stream event pushed via WebSocket or SSE.
 */
export interface TelemetryStreamEvent {
  /** The device that produced this reading */
  deviceId: string;
  /** The organization ID */
  organizationId: string;
  /** Metric name */
  metric: string;
  /** Current value */
  value: number;
  /** Unit of measurement */
  unit?: string;
  /** Timestamp of the reading */
  timestamp: string;
}

/**
 * All telemetry-related types are exported directly from this module.
 * Use `import { AggregationType, TimeRange, ... } from "@cortexgrid/types"` to access them.
 */
