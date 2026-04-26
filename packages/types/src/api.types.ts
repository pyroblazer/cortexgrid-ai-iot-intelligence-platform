// ============================================================================
// CortexGrid API Types
// ============================================================================

/**
 * Standard API response wrapper for all CortexGrid endpoints.
 * Provides a consistent envelope for successful responses.
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: true;
  /** The response payload */
  data: T;
  /** Human-readable message about the result */
  message?: string;
  /** Request tracking identifier for debugging */
  requestId?: string;
  /** Timestamp of the response */
  timestamp: string;
}

/**
 * Paginated response wrapper extending the standard API response
 * with pagination metadata.
 */
export interface PaginatedResponse<T> {
  /** Whether the request was successful */
  success: true;
  /** Array of items for the current page */
  data: T[];
  /** Human-readable message */
  message?: string;
  /** Request tracking identifier */
  requestId?: string;
  /** Timestamp of the response */
  timestamp: string;
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Metadata describing the pagination state of a response.
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page available */
  hasNext: boolean;
  /** Whether there is a previous page available */
  hasPrev: boolean;
}

/**
 * Parameters for paginated list endpoints.
 */
export interface PaginationParams {
  /** Page number to retrieve (1-indexed, default: 1) */
  page?: number;
  /** Number of items per page (default: 20, max: 100) */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Standard error response structure for all CortexGrid endpoints.
 */
export interface ApiError {
  /** Whether the request was successful (always false for errors) */
  success: false;
  /** Machine-readable error code */
  error: {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Detailed validation errors, if applicable */
    details?: ApiErrorDetail[];
    /** Stack trace (only in development mode) */
    stack?: string;
  };
  /** Request tracking identifier for debugging */
  requestId?: string;
  /** Timestamp of the error response */
  timestamp: string;
}

/**
 * A single validation error detail.
 */
export interface ApiErrorDetail {
  /** The field that caused the error (dot-notation for nested fields) */
  field: string;
  /** The error message for this field */
  message: string;
  /** The rejected value, if applicable */
  value?: unknown;
}

/**
 * Health check response indicating service status.
 */
export interface HealthCheckResponse {
  /** Overall service health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Timestamp of the health check */
  timestamp: string;
  /** Service version */
  version: string;
  /** Service uptime in seconds */
  uptime: number;
  /** Health status of individual service dependencies */
  services: Record<
    string,
    {
      /** Status of this dependency */
      status: "healthy" | "degraded" | "unhealthy";
      /** Response time in milliseconds */
      responseTime?: number;
      /** Optional details about the dependency status */
      details?: string;
    }
  >;
}

/**
 * Standard query parameters for filtering list endpoints.
 */
export interface FilterParams {
  /** Search term for text-based filtering */
  search?: string;
  /** Field-value pairs for exact match filtering */
  filters?: Record<string, string>;
  /** Fields to include in the response (comma-separated) */
  fields?: string;
}

/**
 * Bulk operation result for batch requests.
 */
export interface BulkOperationResult<T> {
  /** Number of items successfully processed */
  succeeded: number;
  /** Number of items that failed to process */
  failed: number;
  /** Details of successful operations */
  results: T[];
  /** Details of failed operations */
  errors: BulkOperationError[];
}

/**
 * Error detail for a single item in a bulk operation.
 */
export interface BulkOperationError {
  /** Index of the item in the original request */
  index: number;
  /** The item identifier, if available */
  id?: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Namespace exporting all API-related types.
 */
export namespace ApiTypes {
  export type {
    ApiResponse,
    PaginatedResponse,
    PaginationMeta,
    PaginationParams,
    ApiError,
    ApiErrorDetail,
    HealthCheckResponse,
    FilterParams,
    BulkOperationResult,
    BulkOperationError,
  };
}
