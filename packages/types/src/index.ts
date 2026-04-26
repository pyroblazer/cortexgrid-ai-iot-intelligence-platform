// ============================================================================
// CortexGrid Shared Types - Barrel Export
// ============================================================================

// Auth types
export {
  Role,
  JwtPayload,
  LoginDto,
  RegisterDto,
  TokenResponse,
  AuthUser,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  AuthTypes,
} from "./auth.types";

// Device types
export {
  DeviceStatus,
  DeviceType,
  DeviceProfile,
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceResponse,
  DeviceStats,
  DeviceTypes,
} from "./device.types";

// Telemetry types
export {
  AggregationType,
  TimeRange,
  TelemetryDataPoint,
  TelemetryQuery,
  TelemetryBucket,
  TelemetryResponse,
  TelemetryStreamEvent,
  TelemetryTypes,
} from "./telemetry.types";

// Organization types
export {
  MembershipRole,
  InvitationStatus,
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
  OrganizationTypes,
} from "./organization.types";

// Alert types
export {
  AlertSeverity,
  AlertStatus,
  AlertCondition,
  AlertRule,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  Alert,
  UpdateAlertDto,
  AlertStats,
  AlertTypes,
} from "./alert.types";

// Billing types
export {
  PlanType,
  SubscriptionStatus,
  PlanDetails,
  CreateSubscriptionDto,
  Subscription,
  UsageRecord,
  UsageResourceType,
  UsageSummary,
  Invoice,
  InvoiceLineItem,
  BillingTypes,
} from "./billing.types";

// Notification types
export {
  NotificationType,
  NotificationChannel,
  NotificationPreference,
  UpdateNotificationPreferenceDto,
  Notification,
  MarkNotificationsReadDto,
  UnreadNotificationCount,
  WebhookConfig,
  CreateWebhookDto,
  NotificationTypes,
} from "./notification.types";

// AI types
export {
  AIQuery,
  AIChatMessage,
  AIResponse,
  AIResponseType,
  AnomalyDetectionResult,
  AnomalyType,
  TelemetrySummary,
  TelemetryMetricSummary,
  AIConfig,
  AITypes,
} from "./ai.types";

// API types
export {
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
  ApiTypes,
} from "./api.types";
