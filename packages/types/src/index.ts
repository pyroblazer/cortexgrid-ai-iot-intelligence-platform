// ============================================================================
// CortexGrid Shared Types - Barrel Export
// ============================================================================

// Auth types
export { Role } from "./auth.types";
export type {
  JwtPayload,
  LoginDto,
  RegisterDto,
  TokenResponse,
  AuthUser,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from "./auth.types";

// Device types
export { DeviceStatus, DeviceType } from "./device.types";
export type {
  DeviceProfile,
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceResponse,
  DeviceStats,
} from "./device.types";

// Telemetry types
export { AggregationType } from "./telemetry.types";
export type {
  TimeRange,
  TelemetryDataPoint,
  TelemetryQuery,
  TelemetryBucket,
  TelemetryResponse,
  TelemetryStreamEvent,
} from "./telemetry.types";

// Organization types
export { MembershipRole, InvitationStatus } from "./organization.types";
export type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponse,
  OrganizationMember,
  OrganizationInvitation,
  InviteMemberDto,
  UpdateMemberRoleDto,
  Team,
  CreateTeamDto,
  UpdateTeamDto,
} from "./organization.types";

// Alert types
export { AlertSeverity, AlertStatus } from "./alert.types";
export type {
  AlertCondition,
  AlertRule,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  Alert,
  UpdateAlertDto,
  AlertStats,
} from "./alert.types";

// Billing types
export { PlanType, SubscriptionStatus } from "./billing.types";
export type {
  PlanDetails,
  CreateSubscriptionDto,
  Subscription,
  UsageRecord,
  UsageResourceType,
  UsageSummary,
  Invoice,
  InvoiceLineItem,
} from "./billing.types";

// Notification types
export { NotificationType, NotificationChannel } from "./notification.types";
export type {
  NotificationPreference,
  UpdateNotificationPreferenceDto,
  Notification,
  MarkNotificationsReadDto,
  UnreadNotificationCount,
  WebhookConfig,
  CreateWebhookDto,
} from "./notification.types";

// AI types
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
} from "./ai.types";

// API types
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
} from "./api.types";
