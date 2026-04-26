// ============================================================================
// CortexGrid Notification Types
// ============================================================================

/**
 * Categories of notifications in CortexGrid.
 */
export enum NotificationType {
  /** Alert triggered, acknowledged, or resolved */
  ALERT = "ALERT",
  /** Device status change (online/offline/maintenance) */
  DEVICE_STATUS = "DEVICE_STATUS",
  /** Telemetry threshold exceeded */
  THRESHOLD = "THRESHOLD",
  /** Organization membership changes */
  MEMBERSHIP = "MEMBERSHIP",
  /** Billing and subscription events */
  BILLING = "BILLING",
  /** System announcements and maintenance notices */
  SYSTEM = "SYSTEM",
  /** AI-generated insights and anomaly reports */
  AI_INSIGHT = "AI_INSIGHT",
}

/**
 * Channels through which notifications can be delivered.
 */
export enum NotificationChannel {
  /** In-app notification bell */
  IN_APP = "IN_APP",
  /** Email notification */
  EMAIL = "EMAIL",
  /** SMS text message */
  SMS = "SMS",
  /** Webhook to an external service */
  WEBHOOK = "WEBHOOK",
  /** Mobile push notification */
  PUSH = "PUSH",
  /** Slack message */
  SLACK = "SLACK",
}

/**
 * User-configured notification preference for a given type and channel.
 */
export interface NotificationPreference {
  /** Unique preference identifier */
  id: string;
  /** The user this preference belongs to */
  userId: string;
  /** The organization context */
  organizationId: string;
  /** The notification type this preference applies to */
  type: NotificationType;
  /** The delivery channel this preference applies to */
  channel: NotificationChannel;
  /** Whether notifications of this type and channel are enabled */
  enabled: boolean;
  /** Minimum severity to trigger this notification (for alert types) */
  minSeverity?: string;
  /** Quiet hours start time (HH:mm format, in user's timezone) */
  quietHoursStart?: string;
  /** Quiet hours end time (HH:mm format, in user's timezone) */
  quietHoursEnd?: string;
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Data transfer object for updating notification preferences.
 */
export interface UpdateNotificationPreferenceDto {
  /** Whether this notification type and channel is enabled */
  enabled?: boolean;
  /** Updated minimum severity threshold */
  minSeverity?: string;
  /** Updated quiet hours start */
  quietHoursStart?: string;
  /** Updated quiet hours end */
  quietHoursEnd?: string;
}

/**
 * A notification instance delivered to a user.
 */
export interface Notification {
  /** Unique notification identifier */
  id: string;
  /** The user this notification is addressed to */
  userId: string;
  /** The organization context */
  organizationId: string;
  /** Category of the notification */
  type: NotificationType;
  /** Notification title / subject line */
  title: string;
  /** Full notification message body */
  body: string;
  /** Severity level (for alert-related notifications) */
  severity?: string;
  /** URL to navigate to when the notification is clicked */
  link?: string;
  /** Additional structured data attached to the notification */
  data?: Record<string, unknown>;
  /** Whether the notification has been read by the user */
  isRead: boolean;
  /** Channels this notification was delivered through */
  channels: NotificationChannel[];
  /** Timestamp when the notification was created */
  createdAt: string;
  /** Timestamp when the notification was read */
  readAt?: string;
}

/**
 * Data transfer object for marking notifications as read.
 */
export interface MarkNotificationsReadDto {
  /** IDs of notifications to mark as read */
  notificationIds: string[];
}

/**
 * Count of unread notifications grouped by type.
 */
export interface UnreadNotificationCount {
  /** Total unread count */
  total: number;
  /** Breakdown by notification type */
  byType: Record<NotificationType, number>;
}

/**
 * Webhook configuration for sending notifications to external services.
 */
export interface WebhookConfig {
  /** Unique webhook identifier */
  id: string;
  /** The organization this webhook belongs to */
  organizationId: string;
  /** Display name for this webhook */
  name: string;
  /** The URL to POST notification payloads to */
  url: string;
  /** HTTP method to use */
  method: "POST" | "PUT";
  /** Custom HTTP headers to include */
  headers?: Record<string, string>;
  /** Notification types that trigger this webhook */
  subscribedTypes: NotificationType[];
  /** Whether the webhook is active */
  enabled: boolean;
  /** Shared secret for payload signature verification */
  secret?: string;
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Data transfer object for creating or updating a webhook.
 */
export interface CreateWebhookDto {
  /** Display name */
  name: string;
  /** Target URL */
  url: string;
  /** HTTP method */
  method?: "POST" | "PUT";
  /** Custom headers */
  headers?: Record<string, string>;
  /** Subscribed notification types */
  subscribedTypes: NotificationType[];
  /** Whether the webhook should be active */
  enabled?: boolean;
}

/**
 * Namespace exporting all notification-related types.
 */
export namespace NotificationTypes {
  export type {
    NotificationPreference,
    UpdateNotificationPreferenceDto,
    Notification,
    MarkNotificationsReadDto,
    UnreadNotificationCount,
    WebhookConfig,
    CreateWebhookDto,
  };
  export { NotificationType, NotificationChannel };
}
