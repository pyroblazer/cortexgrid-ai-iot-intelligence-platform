// ============================================================================
// CortexGrid Billing Types
// ============================================================================

/**
 * Subscription plan tiers available in CortexGrid.
 */
export enum PlanType {
  /** Free tier with limited devices and features */
  FREE = "FREE",
  /** Professional tier with expanded limits and advanced features */
  PRO = "PRO",
  /** Enterprise tier with unlimited resources and dedicated support */
  ENTERPRISE = "ENTERPRISE",
}

/**
 * Status of a subscription lifecycle.
 */
export enum SubscriptionStatus {
  /** Subscription is active and in good standing */
  ACTIVE = "ACTIVE",
  /** Subscription payment is past due */
  PAST_DUE = "PAST_DUE",
  /** Subscription has been canceled but is still active until period end */
  CANCELED = "CANCELED",
  /** Subscription has expired and is no longer active */
  EXPIRED = "EXPIRED",
  /** Subscription is in a trial period */
  TRIALING = "TRIALING",
  /** Subscription payment is being processed */
  PENDING = "PENDING",
}

/**
 * Details about a specific subscription plan.
 */
export interface PlanDetails {
  /** Plan type identifier */
  type: PlanType;
  /** Display name of the plan */
  name: string;
  /** Monthly price in cents (0 for FREE) */
  priceMonthly: number;
  /** Annual price in cents (0 for FREE) */
  priceAnnual: number;
  /** Maximum number of devices allowed */
  maxDevices: number;
  /** Maximum number of team members allowed */
  maxMembers: number;
  /** Maximum telemetry data retention period in days */
  dataRetentionDays: number;
  /** Whether advanced AI features are included */
  hasAiFeatures: boolean;
  /** Whether priority support is included */
  hasPrioritySupport: boolean;
  /** List of feature identifiers included in this plan */
  features: string[];
}

/**
 * Data transfer object for creating or updating a subscription.
 */
export interface CreateSubscriptionDto {
  /** The plan to subscribe to */
  planType: PlanType;
  /** Whether to bill annually (true) or monthly (false) */
  isAnnual: boolean;
  /** Payment method identifier from the payment provider */
  paymentMethodId?: string;
  /** Coupon or promotional code */
  promoCode?: string;
}

/**
 * Current subscription state for an organization.
 */
export interface Subscription {
  /** Unique subscription identifier */
  id: string;
  /** The organization this subscription belongs to */
  organizationId: string;
  /** Current plan type */
  planType: PlanType;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Whether the subscription is billed annually */
  isAnnual: boolean;
  /** Timestamp when the current billing period started */
  currentPeriodStart: string;
  /** Timestamp when the current billing period ends */
  currentPeriodEnd: string;
  /** Timestamp when the trial ends, if applicable */
  trialEndsAt?: string;
  /** Timestamp when the subscription will be canceled, if scheduled */
  cancelAt?: string;
  /** External payment provider subscription ID */
  providerSubscriptionId?: string;
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Record of resource usage for billing calculations.
 */
export interface UsageRecord {
  /** Unique usage record identifier */
  id: string;
  /** The organization this usage belongs to */
  organizationId: string;
  /** Type of resource consumed */
  resourceType: UsageResourceType;
  /** Quantity of the resource consumed */
  quantity: number;
  /** Unit of measurement for the quantity */
  unit: string;
  /** Timestamp when this usage was recorded */
  recordedAt: string;
  /** Billing period this usage falls within */
  billingPeriodStart: string;
  /** End of the billing period */
  billingPeriodEnd: string;
}

/**
 * Types of billable resources in CortexGrid.
 */
export type UsageResourceType =
  | "devices"
  | "telemetry_data_points"
  | "api_calls"
  | "ai_queries"
  | "storage_bytes"
  | "sms_notifications"
  | "email_notifications";

/**
 * Summary of usage for the current billing period.
 */
export interface UsageSummary {
  /** The organization this summary belongs to */
  organizationId: string;
  /** Current billing period start */
  periodStart: string;
  /** Current billing period end */
  periodEnd: string;
  /** Usage breakdown by resource type */
  usage: Record<UsageResourceType, number>;
  /** Resource limits for the current plan */
  limits: Record<UsageResourceType, number>;
  /** Percentage used for each resource type */
  usagePercentage: Record<UsageResourceType, number>;
}

/**
 * Details of a billing invoice.
 */
export interface Invoice {
  /** Unique invoice identifier */
  id: string;
  /** The organization this invoice belongs to */
  organizationId: string;
  /** External payment provider invoice ID */
  providerInvoiceId?: string;
  /** Invoice line items */
  lineItems: InvoiceLineItem[];
  /** Subtotal before tax in cents */
  subtotal: number;
  /** Tax amount in cents */
  tax: number;
  /** Total amount due in cents */
  total: number;
  /** Currency code (e.g. "USD") */
  currency: string;
  /** Payment status of this invoice */
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  /** Timestamp when the invoice was generated */
  createdAt: string;
  /** Timestamp when payment is due */
  dueDate: string;
  /** Timestamp when the invoice was paid */
  paidAt?: string;
}

/**
 * A single line item on an invoice.
 */
export interface InvoiceLineItem {
  /** Description of the charge */
  description: string;
  /** Quantity billed */
  quantity: number;
  /** Unit price in cents */
  unitPrice: number;
  /** Total for this line item in cents */
  amount: number;
}

/**
 * All billing-related types are exported directly from this module.
 * Use `import { PlanType, SubscriptionStatus, ... } from "@cortexgrid/types"` to access them.
 */
