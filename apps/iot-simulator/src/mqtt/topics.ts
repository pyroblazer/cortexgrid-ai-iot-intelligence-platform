const TOPIC_PREFIX = 'cortexgrid';

/**
 * Builds a telemetry topic for a device.
 * Pattern: cortexgrid/{orgId}/devices/{deviceId}/telemetry
 */
export function telemetryTopic(orgId: string, deviceId: string): string {
  return `${TOPIC_PREFIX}/${orgId}/devices/${deviceId}/telemetry`;
}

/**
 * Builds a status topic for a device.
 * Pattern: cortexgrid/{orgId}/devices/{deviceId}/status
 */
export function statusTopic(orgId: string, deviceId: string): string {
  return `${TOPIC_PREFIX}/${orgId}/devices/${deviceId}/status`;
}

/**
 * Builds a command topic for a device.
 * Pattern: cortexgrid/{orgId}/devices/{deviceId}/commands
 */
export function commandTopic(orgId: string, deviceId: string): string {
  return `${TOPIC_PREFIX}/${orgId}/devices/${deviceId}/commands`;
}

/**
 * Builds a generic topic with a custom type suffix.
 * Pattern: cortexgrid/{orgId}/devices/{deviceId}/{type}
 */
export function buildTopic(orgId: string, deviceId: string, type: string): string {
  return `${TOPIC_PREFIX}/${orgId}/devices/${deviceId}/${type}`;
}
