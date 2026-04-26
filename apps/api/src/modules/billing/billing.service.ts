/**
 * @file billing.service.ts
 * @description Subscription billing service integrating with Stripe for payment
 * processing, checkout sessions, customer portal, and webhook handling.
 *
 * ELI5: This file handles all money-related stuff. When a user wants to upgrade
 * from the Free plan to Pro or Enterprise, this service:
 *   - Creates a Stripe checkout session (the payment page the user sees)
 *   - Manages the Stripe customer portal (where users manage their subscription)
 *   - Receives webhook events from Stripe (like "payment succeeded" or "subscription cancelled")
 *   - Updates the organization's plan and device limits based on subscription status
 *
 * KEY CONCEPTS:
 *   - Stripe Checkout: A hosted payment page. We don't handle credit cards directly.
 *     Stripe handles PCI compliance, card processing, etc. We just redirect users there.
 *
 *   - Webhooks: Stripe sends HTTP POST requests to our server whenever something
 *     happens (payment succeeds, subscription cancels, etc.). We verify the
 *     webhook signature to ensure it's really from Stripe (not a fake request).
 *
 *   - Customer Portal: A Stripe-hosted page where users can update their payment
 *     method, view invoices, or cancel their subscription without us building that UI.
 *
 *   - Lazy Stripe import: Stripe SDK is imported dynamically (await import('stripe'))
 *     so the app doesn't crash at startup if Stripe keys aren't configured.
 *     This lets the app run in development without Stripe credentials.
 *
 * WHY Stripe? It handles PCI compliance, fraud detection, invoicing, and tax
 * calculation so we don't have to build any of that ourselves.
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCheckoutDto, CreatePortalDto } from './dto/checkout.dto';
import { PlanType, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  /** Stripe API secret key for authenticating with Stripe's API. */
  private readonly stripeSecretKey: string;
  /** Webhook signing secret for verifying incoming webhook events are from Stripe. */
  private readonly stripeWebhookSecret: string;
  /** Maps plan names (PRO, ENTERPRISE) to their Stripe Price IDs. */
  private readonly planPriceIds: Record<string, string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Load Stripe configuration from environment variables.
    // Empty string defaults mean billing features are disabled if not configured.
    this.stripeSecretKey = this.configService.get<string>(
      'STRIPE_SECRET_KEY',
      '',
    );
    this.stripeWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      '',
    );
    // Each plan has a corresponding Price ID in Stripe.
    // When we create a checkout session, we pass this Price ID to Stripe.
    this.planPriceIds = {
      PRO: this.configService.get<string>('STRIPE_PRO_PRICE_ID', ''),
      ENTERPRISE: this.configService.get<string>(
        'STRIPE_ENTERPRISE_PRICE_ID',
        '',
      ),
    };
  }

  /**
   * Get the current subscription details for an organization.
   *
   * Returns plan type, subscription status, billing period end date,
   * and device usage (used vs. limit). Used by the frontend billing page
   * to show the user their current plan and usage.
   */
  async getSubscription(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        deviceLimit: true,
        stripeCustomerId: true,
        createdAt: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Count active devices to show usage vs. limit on the billing page.
    const deviceCount = await this.prisma.device.count({
      where: { organizationId, isActive: true },
    });

    const planDetails = this.getPlanDetails(organization.plan);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      plan: {
        type: organization.plan,
        ...planDetails,
      },
      status: organization.subscriptionStatus,
      currentPeriodEnd: organization.subscriptionCurrentPeriodEnd,
      usage: {
        devices: {
          used: deviceCount,
          limit: organization.deviceLimit,
        },
      },
      stripeCustomerId: organization.stripeCustomerId,
    };
  }

  /**
   * Create a Stripe Checkout session for upgrading to a paid plan.
   *
   * ELI5: When a user clicks "Upgrade to Pro", this method creates a
   * Stripe-hosted payment page and returns the URL. The user enters their
   * credit card on Stripe's page (we never see the card number). After
   * payment, Stripe sends us a webhook to confirm.
   *
   * Steps:
   *   1. Validate that Stripe is configured and the plan is valid
   *   2. Create or reuse a Stripe Customer for this organization
   *   3. Create a Checkout Session with the plan's Price ID
   *   4. Return the checkout URL for the frontend to redirect to
   */
  async createCheckoutSession(
    organizationId: string,
    email: string,
    checkoutDto: CreateCheckoutDto,
  ) {
    // Guard: If Stripe keys aren't configured, billing is effectively disabled.
    // This lets the app run in development without Stripe credentials.
    if (!this.stripeSecretKey) {
      throw new BadRequestException(
        'Billing is not configured. Please contact support.',
      );
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Look up the Stripe Price ID for the selected plan.
    const priceId = this.planPriceIds[checkoutDto.plan];
    if (!priceId) {
      throw new BadRequestException(
        `Invalid plan selected: ${checkoutDto.plan}`,
      );
    }

    // Dynamically import Stripe SDK to avoid startup crash if not configured.
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(this.stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    let customerId = organization.stripeCustomerId;

    // If this org doesn't have a Stripe Customer yet, create one.
    // The customer record in Stripe links to our organization for future billing.
    if (!customerId) {
      // Create a Stripe Customer with the user's email and org metadata.
      // This links Stripe's billing records back to our organization.
      const customer = await stripe.customers.create({
        email,
        metadata: {
          organizationId,
          organizationName: organization.name,
        },
      });

      customerId = customer.id;

      // Save the Stripe Customer ID so we reuse it for future transactions.
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create the Checkout Session. This generates a Stripe-hosted payment page.
    // mode: 'subscription' means recurring billing (not one-time payment).
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // URLs Stripe redirects to after the user completes or cancels payment.
      // {CHECKOUT_SESSION_ID} is a placeholder Stripe replaces with the actual session ID.
      success_url:
        checkoutDto.successUrl ||
        `${this.configService.get('NEXT_PUBLIC_API_URL', 'http://localhost:3001')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        checkoutDto.cancelUrl ||
        `${this.configService.get('NEXT_PUBLIC_API_URL', 'http://localhost:3001')}/billing/cancel`,
      // Embed organization and plan in metadata so the webhook handler
      // knows which org to update when payment succeeds.
      metadata: {
        organizationId,
        plan: checkoutDto.plan,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create a Stripe Customer Portal session for managing an existing subscription.
   *
   * ELI5: The customer portal is a Stripe-hosted page where users can:
   *   - Update their credit card on file
   *   - View invoices and payment history
   *   - Cancel their subscription
   * We just create a session and redirect the user there.
   */
  async createPortalSession(
    organizationId: string,
    portalDto: CreatePortalDto,
  ) {
    if (!this.stripeSecretKey) {
      throw new BadRequestException(
        'Billing is not configured. Please contact support.',
      );
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // Organization must already have a Stripe Customer ID (created during checkout).
    if (!organization || !organization.stripeCustomerId) {
      throw new BadRequestException(
        'No billing account found. Please subscribe to a plan first.',
      );
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(this.stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url:
        portalDto.returnUrl ||
        `${this.configService.get('NEXT_PUBLIC_API_URL', 'http://localhost:3001')}/billing`,
    });

    return {
      url: session.url,
    };
  }

  /**
   * Handle incoming Stripe webhook events.
   *
   * ELI5: After something happens in Stripe (payment succeeds, subscription
   * is cancelled, etc.), Stripe sends a notification to our server. This method:
   *   1. Verifies the notification is really from Stripe (signature check)
   *   2. Routes the event to the appropriate handler based on event type
   *   3. Updates our database to reflect the new billing state
   *
   * CRITICAL: The raw body must be passed (not parsed JSON) because the
   * Stripe signature is computed over the raw bytes. Express's JSON parser
   * would destroy the signature if it parsed the body first.
   *
   * Webhook events handled:
   *   - checkout.session.completed: New subscription purchased
   *   - customer.subscription.updated: Plan changed or renewed
   *   - customer.subscription.deleted: Subscription cancelled
   *   - invoice.payment_failed: Card charge failed
   */
  async handleWebhook(rawBody: Buffer | undefined, signature: string) {
    if (!this.stripeSecretKey || !this.stripeWebhookSecret) {
      this.logger.warn('Stripe webhook received but billing is not configured');
      return { received: true };
    }

    if (!rawBody || !signature) {
      throw new BadRequestException('Missing webhook payload or signature');
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(this.stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // Verify the webhook signature to ensure it's genuinely from Stripe.
    // This prevents attackers from sending fake webhook events.
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.stripeWebhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    // Route the event to the appropriate handler based on type.
    switch (event.type) {
      // User completed the checkout - activate their subscription.
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Extract the org and plan from the metadata we set during checkout creation.
        const orgId = session.metadata?.organizationId;
        const plan = session.metadata?.plan as PlanType;

        if (orgId && plan) {
          await this.handleCheckoutComplete(orgId, plan, session.subscription);
        }
        break;
      }

      // Subscription was modified (plan change, renewal, etc.)
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }

      // Subscription was cancelled - downgrade to Free plan.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.handleSubscriptionCancellation(subscription);
        break;
      }

      // Payment failed - mark subscription as past due so we can notify the user.
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await this.handlePaymentFailure(invoice);
        break;
      }

      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Get paginated usage records for an organization.
   *
   * Usage records track how many API calls, telemetry ingests, AI queries,
   * etc. the organization has consumed in each billing period.
   */
  async getUsage(
    organizationId: string,
    pagination: { page: number; limit: number },
  ) {
    const skip = (pagination.page - 1) * pagination.limit;

    const [records, total] = await Promise.all([
      this.prisma.usageRecord.findMany({
        where: { organizationId },
        orderBy: { period: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.usageRecord.count({
        where: { organizationId },
      }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
        hasNextPage: pagination.page * pagination.limit < total,
        hasPrevPage: pagination.page > 1,
      },
    };
  }

  /**
   * Check if an organization can add more devices based on their plan limit.
   *
   * Returns the current count, limit, and a boolean flag.
   * Used by the device service before creating a new device.
   */
  async checkDeviceLimit(organizationId: string): Promise<{ used: number; limit: number; canAdd: boolean }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { deviceLimit: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const used = await this.prisma.device.count({
      where: { organizationId, isActive: true },
    });

    return {
      used,
      limit: organization.deviceLimit,
      canAdd: used < organization.deviceLimit,
    };
  }

  getPlanLimits(planType: PlanType) {
    return this.getPlanDetails(planType);
  }

  /**
   * Get all available subscription plans with their features and pricing.
   *
   * Used by the frontend to display the pricing page.
   * Free plan has no Stripe Price ID (it's the default, no checkout needed).
   */
  async getAvailablePlans() {
    return {
      plans: [
        {
          id: 'FREE',
          name: 'Free',
          price: 0,
          interval: 'forever',
          features: [
            'Up to 5 devices',
            '30-day telemetry retention',
            'Basic alert rules',
            'Email notifications',
          ],
          deviceLimit: 5,
          telemetryRetentionDays: 30,
        },
        {
          id: 'PRO',
          name: 'Pro',
          price: 29,
          interval: 'month',
          features: [
            'Up to 50 devices',
            '90-day telemetry retention',
            'Advanced alert rules',
            'AI-powered analytics',
            'Priority support',
            'Custom dashboards',
          ],
          deviceLimit: 50,
          telemetryRetentionDays: 90,
        },
        {
          id: 'ENTERPRISE',
          name: 'Enterprise',
          price: 99,
          interval: 'month',
          features: [
            'Unlimited devices',
            '365-day telemetry retention',
            'Custom alert rules',
            'Advanced AI analytics',
            'Dedicated support',
            'Custom integrations',
            'SLA guarantee',
          ],
          deviceLimit: 1000,
          telemetryRetentionDays: 365,
        },
      ],
    };
  }

  /**
   * Handle a completed checkout session by activating the purchased plan.
   *
   * Updates the organization's plan, device limit, and subscription period.
   * Called when Stripe confirms a successful payment via webhook.
   */
  private async handleCheckoutComplete(
    organizationId: string,
    plan: PlanType,
    subscriptionId: string,
  ) {
    const planLimits = this.getPlanDetails(plan);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: subscriptionId,
        deviceLimit: planLimits.deviceLimit,
        subscriptionCurrentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
      },
    });

    this.logger.log(
      `Subscription activated: org=${organizationId}, plan=${plan}`,
    );
  }

  /**
   * Handle subscription updates (plan changes, renewals).
   *
   * Syncs the subscription status and billing period end date from Stripe
   * to our database so our app always reflects the current billing state.
   */
  private async handleSubscriptionUpdate(subscription: any) {
    const organization = await this.prisma.organization.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!organization) return;

    // Map Stripe's status strings to our enum values.
    const newStatus = this.mapStripeStatus(subscription.status);
    // Stripe sends timestamps as Unix epoch seconds; convert to JavaScript Date.
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus: newStatus,
        subscriptionCurrentPeriodEnd: periodEnd,
      },
    });

    this.logger.log(
      `Subscription updated: org=${organization.id}, status=${newStatus}`,
    );
  }

  /**
   * Handle subscription cancellation by downgrading to Free plan.
   *
   * Resets device limit to 5 and clears the Stripe subscription ID.
   * The organization can continue using the platform on the Free tier.
   */
  private async handleSubscriptionCancellation(subscription: any) {
    const organization = await this.prisma.organization.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!organization) return;

    await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        plan: PlanType.FREE,
        subscriptionStatus: SubscriptionStatus.CANCELED,
        deviceLimit: 5,
        stripeSubscriptionId: null,
      },
    });

    this.logger.log(`Subscription canceled: org=${organization.id}`);
  }

  /**
   * Handle a failed payment by marking the subscription as past due.
   *
   * This triggers the frontend to show a "payment required" banner
   * prompting the user to update their payment method.
   */
  private async handlePaymentFailure(invoice: any) {
    const organization = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: invoice.customer },
    });

    if (!organization) return;

    await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      },
    });

    this.logger.warn(`Payment failed: org=${organization.id}`);
  }

  /**
   * Get the feature limits for each plan type.
   *
   * deviceLimit: Max number of active devices allowed.
   * telemetryRetentionDays: How long historical data is kept.
   * aiQueriesPerDay: Max AI queries per day (-1 = unlimited for Enterprise).
   */
  private getPlanDetails(plan: PlanType) {
    const planConfig: Record<
      string,
      { deviceLimit: number; telemetryRetentionDays: number; aiQueriesPerDay: number }
    > = {
      FREE: { deviceLimit: 5, telemetryRetentionDays: 30, aiQueriesPerDay: 10 },
      PRO: { deviceLimit: 50, telemetryRetentionDays: 90, aiQueriesPerDay: 100 },
      ENTERPRISE: { deviceLimit: 1000, telemetryRetentionDays: 365, aiQueriesPerDay: -1 },
    };

    return planConfig[plan] || planConfig.FREE;
  }

  /**
   * Map Stripe subscription status strings to our internal SubscriptionStatus enum.
   *
   * Stripe has more status values than we track, so we map several
   * Stripe statuses to our INACTIVE status for simplicity.
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      trialing: SubscriptionStatus.TRIALING,
      incomplete: SubscriptionStatus.INACTIVE,
      incomplete_expired: SubscriptionStatus.INACTIVE,
      unpaid: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.INACTIVE,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.INACTIVE;
  }
}
