import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailService } from '../../email/email.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor('billing-webhooks')
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    @InjectQueue('notification-delivery') private readonly notificationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ eventType: string; payload: Record<string, any> }>): Promise<void> {
    const { eventType, payload } = job.data;

    try {
      switch (eventType) {
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(payload);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(payload);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(payload);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(payload);
          break;

        default:
          this.logger.log(`Billing event processed: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process billing event ${eventType}: ${(error as Error).message}`);
    }
  }

  private async handlePaymentFailed(payload: Record<string, any>) {
    const org = await this.findOrgByStripeCustomer(payload.customer);
    if (!org) {
      this.logger.warn(`No org found for Stripe customer ${payload.customer}`);
      return;
    }

    this.logger.warn(
      `Payment failed for org "${org.name}" (${org.id}) — customer ${payload.customer}`,
    );

    // Notify org owner about the failed payment
    await this.notificationQueue.add('notification', {
      userId: org.ownerId,
      organizationId: org.id,
      type: 'BILLING',
      title: 'Payment Failed',
      message: `A payment attempt for your ${org.plan} plan subscription failed. Please update your payment method to avoid service interruption.`,
      metadata: { stripeCustomerId: payload.customer, invoiceId: payload.id },
    });

    // Send email if SMTP is configured
    if (this.emailService.isConfigured()) {
      const owner = await this.prisma.user.findUnique({ where: { id: org.ownerId } });
      if (owner) {
        await this.emailService.send(
          owner.email,
          'Payment Failed — Action Required',
          `<p>Hi ${owner.firstName || 'there'},</p>
           <p>A payment for your <strong>${org.plan}</strong> plan on CortexGrid failed.</p>
           <p>Please update your payment method in your billing settings to avoid service interruption.</p>`,
        ).catch((err) => this.logger.error(`Failed to send payment failure email: ${err instanceof Error ? err.message : String(err)}`));
      }
    }
  }

  private async handleSubscriptionDeleted(payload: Record<string, any>) {
    const org = await this.findOrgByStripeCustomer(payload.customer);
    if (!org) return;

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: 'FREE' as any,
        subscriptionStatus: 'CANCELED',
        deviceLimit: 5,
        stripeSubscriptionId: null,
      },
    });

    // Invalidate any cached org data
    await this.redisService.del(`org:${org.id}`).catch(() => {});

    this.logger.log(`Subscription canceled for org "${org.name}" — downgraded to FREE`);

    await this.notificationQueue.add('notification', {
      userId: org.ownerId,
      organizationId: org.id,
      type: 'BILLING',
      title: 'Subscription Canceled',
      message: 'Your subscription has been canceled. Your organization has been downgraded to the FREE plan.',
    });
  }

  private async handleSubscriptionUpdated(payload: Record<string, any>) {
    const org = await this.findOrgByStripeCustomer(payload.customer);
    if (!org) return;

    const plan = this.mapStripePlanToPlanType(payload.plan?.id);
    const deviceLimit = this.getDeviceLimit(plan);

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: plan as any,
        subscriptionStatus: 'ACTIVE',
        deviceLimit,
      },
    });

    await this.redisService.del(`org:${org.id}`).catch(() => {});

    this.logger.log(`Subscription updated for org "${org.name}" — now on ${plan} plan`);
  }

  private async handleCheckoutCompleted(payload: Record<string, any>) {
    const org = await this.findOrgByStripeCustomer(payload.customer);
    if (!org) return;

    await this.prisma.organization.update({
      where: { id: org.id },
      data: { subscriptionStatus: 'ACTIVE' },
    });

    this.logger.log(`Checkout completed for org "${org.name}"`);

    await this.notificationQueue.add('notification', {
      userId: org.ownerId,
      organizationId: org.id,
      type: 'BILLING',
      title: 'Subscription Activated',
      message: 'Your subscription has been activated successfully. Welcome aboard!',
    });
  }

  private async findOrgByStripeCustomer(stripeCustomerId: string) {
    if (!stripeCustomerId) return null;
    return this.prisma.organization.findUnique({
      where: { stripeCustomerId },
      select: { id: true, name: true, plan: true, ownerId: true },
    });
  }

  private mapStripePlanToPlanType(stripePlanId?: string): string {
    if (!stripePlanId) return 'FREE';
    if (stripePlanId.includes('enterprise')) return 'ENTERPRISE';
    if (stripePlanId.includes('pro')) return 'PRO';
    return 'FREE';
  }

  private getDeviceLimit(plan: string): number {
    switch (plan) {
      case 'ENTERPRISE': return 1000;
      case 'PRO': return 50;
      default: return 5;
    }
  }
}
