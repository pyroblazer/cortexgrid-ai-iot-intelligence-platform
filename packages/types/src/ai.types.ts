// ============================================================================
// CortexGrid AI Types
// ============================================================================

/**
 * A natural language query submitted to the AI engine for analysis.
 */
export interface AIQuery {
  /** The natural language question or instruction */
  query: string;
  /** The organization context for the query */
  organizationId: string;
  /** Optional device IDs to scope the query to */
  deviceIds?: string[];
  /** Optional time range to scope the query */
  timeRange?: {
    start: string;
    end: string;
  };
  /** Conversation ID for multi-turn interactions */
  conversationId?: string;
  /** Optional context or previous messages for continuity */
  context?: AIChatMessage[];
}

/**
 * A single message within an AI conversation.
 */
export interface AIChatMessage {
  /** Role of the message sender */
  role: "user" | "assistant" | "system";
  /** The message content */
  content: string;
  /** Timestamp of the message */
  timestamp: string;
}

/**
 * Response from the AI engine to a user query.
 */
export interface AIResponse {
  /** Unique response identifier */
  id: string;
  /** The query this response addresses */
  queryId: string;
  /** The organization context */
  organizationId: string;
  /** Conversation ID for multi-turn interactions */
  conversationId?: string;
  /** The generated response text */
  content: string;
  /** Confidence score between 0 and 1 */
  confidence: number;
  /** Type of response generated */
  responseType: AIResponseType;
  /** Structured data returned alongside the text response */
  data?: Record<string, unknown>;
  /** Suggested follow-up queries */
  suggestions?: string[];
  /** Timestamp when the response was generated */
  createdAt: string;
}

/**
 * Classification of AI response types.
 */
export type AIResponseType =
  | "text"
  | "summary"
  | "anomaly_report"
  | "prediction"
  | "recommendation"
  | "data_analysis"
  | "code";

/**
 * Result of anomaly detection analysis on telemetry data.
 */
export interface AnomalyDetectionResult {
  /** Unique result identifier */
  id: string;
  /** The organization this result belongs to */
  organizationId: string;
  /** The device that produced the anomalous data */
  deviceId: string;
  /** The device name */
  deviceName: string;
  /** The metric where the anomaly was detected */
  metric: string;
  /** The anomalous value observed */
  value: number;
  /** The expected value range */
  expectedRange: {
    /** Lower bound of expected values */
    min: number;
    /** Upper bound of expected values */
    max: number;
  };
  /** Anomaly severity score between 0 and 1 (higher = more severe) */
  severity: number;
  /** Categorization of the detected anomaly */
  anomalyType: AnomalyType;
  /** Human-readable description of the anomaly */
  description: string;
  /** Suggested root causes */
  possibleCauses?: string[];
  /** Recommended actions to address the anomaly */
  recommendedActions?: string[];
  /** Timestamp when the anomaly was detected */
  detectedAt: string;
  /** Time window of data analyzed */
  analysisWindow: {
    start: string;
    end: string;
  };
}

/**
 * Classification of anomaly types detected by the AI engine.
 */
export type AnomalyType =
  | "spike"
  | "drop"
  | "trend_change"
  | "noise_increase"
  | "pattern_deviation"
  | "missing_data"
  | "stuck_value";

/**
 * AI-generated summary of telemetry data for a device or organization.
 */
export interface TelemetrySummary {
  /** Unique summary identifier */
  id: string;
  /** The organization this summary belongs to */
  organizationId: string;
  /** The device this summary covers (omitted for org-wide summaries) */
  deviceId?: string;
  /** The time range covered by this summary */
  timeRange: {
    start: string;
    end: string;
  };
  /** Natural language summary of the telemetry data */
  summary: string;
  /** Key highlights extracted from the data */
  highlights: string[];
  /** Statistical summary by metric */
  metrics: TelemetryMetricSummary[];
  /** Timestamp when the summary was generated */
  generatedAt: string;
}

/**
 * Statistical summary for a single metric within a telemetry summary.
 */
export interface TelemetryMetricSummary {
  /** Metric name */
  metric: string;
  /** Unit of measurement */
  unit?: string;
  /** Minimum value observed */
  min: number;
  /** Maximum value observed */
  max: number;
  /** Average value */
  avg: number;
  /** Standard deviation */
  stdDev: number;
  /** Number of data points analyzed */
  count: number;
  /** Trend direction observed */
  trend: "increasing" | "decreasing" | "stable";
}

/**
 * Configuration for AI features within an organization.
 */
export interface AIConfig {
  /** The organization this config belongs to */
  organizationId: string;
  /** Whether AI features are enabled */
  enabled: boolean;
  /** Maximum AI queries per day */
  dailyQueryLimit: number;
  /** Number of queries used today */
  dailyQueryUsage: number;
  /** Whether anomaly detection is enabled */
  anomalyDetectionEnabled: boolean;
  /** Sensitivity level for anomaly detection (0-1, higher = more sensitive) */
  anomalySensitivity: number;
  /** Whether telemetry summaries are enabled */
  summaryEnabled: boolean;
  /** Summary generation frequency (e.g. "daily", "weekly") */
  summaryFrequency: string;
}

/**
 * Namespace exporting all AI-related types.
 */
export namespace AITypes {
  export type {
    AIQuery,
    AIChatMessage,
    AIResponse,
    AIResponseType,
    AnomalyDetectionResult,
    AnomalyType,
    TelemetrySummary,
    TelemetryMetricSummary,
    AIConfig,
  };
}
