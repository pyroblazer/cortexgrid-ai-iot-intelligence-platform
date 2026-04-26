// ============================================================================
// CortexGrid Device Types
// ============================================================================

/**
 * Possible operational statuses for a device.
 */
export enum DeviceStatus {
  /** Device is connected and actively reporting data */
  ONLINE = "ONLINE",
  /** Device is disconnected or unresponsive */
  OFFLINE = "OFFLINE",
  /** Device is under maintenance and not reporting */
  MAINTENANCE = "MAINTENANCE",
}

/**
 * Classification of device hardware capabilities.
 */
export enum DeviceType {
  /** Device that collects and reports environmental data */
  SENSOR = "SENSOR",
  /** Device that can perform actions based on commands */
  ACTUATOR = "ACTUATOR",
  /** Device that aggregates and routes data from other devices */
  GATEWAY = "GATEWAY",
}

/**
 * Comprehensive device profile containing all metadata and configuration
 * for a provisioned device in the platform.
 */
export interface DeviceProfile {
  /** Unique device identifier */
  id: string;
  /** Human-readable device name */
  name: string;
  /** Optional description of the device */
  description?: string;
  /** Hardware type classification */
  type: DeviceType;
  /** Current operational status */
  status: DeviceStatus;
  /** Organization that owns this device */
  organizationId: string;
  /** Device serial number or hardware identifier */
  serialNumber?: string;
  /** Physical location or deployment site */
  location?: string;
  /** Key-value pairs for custom device metadata */
  metadata?: Record<string, unknown>;
  /** Firmware version currently installed on the device */
  firmwareVersion?: string;
  /** Timestamp of the last telemetry message received */
  lastSeenAt?: string;
  /** Timestamp of device creation */
  createdAt: string;
  /** Timestamp of last device update */
  updatedAt: string;
}

/**
 * Data transfer object for creating a new device.
 */
export interface CreateDeviceDto {
  /** Human-readable device name */
  name: string;
  /** Optional description of the device */
  description?: string;
  /** Hardware type classification */
  type: DeviceType;
  /** Device serial number or hardware identifier */
  serialNumber?: string;
  /** Physical location or deployment site */
  location?: string;
  /** Key-value pairs for custom device metadata */
  metadata?: Record<string, unknown>;
  /** Firmware version currently installed */
  firmwareVersion?: string;
  /** Tags for categorizing the device */
  tags?: string[];
}

/**
 * Data transfer object for updating an existing device.
 * All fields are optional; only provided fields will be updated.
 */
export interface UpdateDeviceDto {
  /** Updated device name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated hardware type */
  type?: DeviceType;
  /** Updated status */
  status?: DeviceStatus;
  /** Updated serial number */
  serialNumber?: string;
  /** Updated physical location */
  location?: string;
  /** Updated custom metadata */
  metadata?: Record<string, unknown>;
  /** Updated firmware version */
  firmwareVersion?: string;
  /** Updated tags */
  tags?: string[];
}

/**
 * Detailed device response including profile data and computed fields.
 */
export interface DeviceResponse {
  /** Unique device identifier */
  id: string;
  /** Human-readable device name */
  name: string;
  /** Optional description */
  description?: string;
  /** Hardware type classification */
  type: DeviceType;
  /** Current operational status */
  status: DeviceStatus;
  /** Owning organization ID */
  organizationId: string;
  /** Device serial number */
  serialNumber?: string;
  /** Physical location */
  location?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Firmware version */
  firmwareVersion?: string;
  /** Categorization tags */
  tags: string[];
  /** Timestamp of the last telemetry message */
  lastSeenAt?: string;
  /** Whether the device is currently connected */
  isConnected: boolean;
  /** Timestamp of device creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Summary statistics for a collection of devices.
 */
export interface DeviceStats {
  /** Total number of devices */
  total: number;
  /** Number of devices currently online */
  online: number;
  /** Number of devices currently offline */
  offline: number;
  /** Number of devices in maintenance mode */
  maintenance: number;
  /** Breakdown by device type */
  byType: Record<DeviceType, number>;
}

/**
 * Namespace exporting all device-related types.
 */
export namespace DeviceTypes {
  export type {
    DeviceProfile,
    CreateDeviceDto,
    UpdateDeviceDto,
    DeviceResponse,
    DeviceStats,
  };
  export { DeviceStatus, DeviceType };
}
