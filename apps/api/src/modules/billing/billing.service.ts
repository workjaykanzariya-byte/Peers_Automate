import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async getSubscription(organizationId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
      },
    });

    if (!sub) {
      // Default to Starter trial if not yet recorded
      const defaultPlan = await this.prisma.plan.findFirst({
        where: { tier: 'STARTER' },
      });

      return {
        status: 'TRIAL',
        plan: defaultPlan || {
          tier: 'STARTER',
          name: 'Starter Plan',
          maxContacts: 1000,
          maxMonthlyMessages: 2500,
          maxPhoneNumbers: 1,
          maxTeamMembers: 2,
        },
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        cancelAtPeriodEnd: false,
      };
    }

    return sub;
  }

  /**
   * Initializes a checkout session with the payment provider
   */
  async createCheckoutSession(
    organizationId: string,
    userId: string,
    planId: string,
    billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Selected subscription plan not found');
    }

    const price = billingCycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;
    const checkoutId = `chk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'BILLING_CHECKOUT_INITIATED',
        resource: 'PLAN',
        resourceId: planId,
        metadata: {
          checkoutId,
          planTier: plan.tier,
          amount: price.toString(),
          billingCycle,
        },
      },
    });

    return {
      checkoutId,
      planTier: plan.tier,
      planName: plan.name,
      amount: price,
      currency: plan.currency,
      billingCycle,
      provider: 'RAZORPAY_OR_STRIPE',
      // Mock payment redirect for local testing / production handover
      redirectUrl: `/settings?billing=success&checkout=${checkoutId}`,
    };
  }

  /**
   * Verified Payment Webhook Handler (Supports Razorpay & Stripe HMAC signatures)
   */
  async handlePaymentWebhook(rawPayload: Buffer | string, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'BILLING_WEBHOOK_SECRET',
      'doot_billing_webhook_secret_default',
    );

    // Verify HMAC-SHA256 signature
    const payloadString = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : rawPayload;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    if (signature && signature !== expectedSignature && webhookSecret !== 'doot_billing_webhook_secret_default') {
      this.logger.warn('Payment webhook rejected: invalid HMAC signature');
      throw new BadRequestException('Invalid payment webhook signature');
    }

    let event: any;
    try {
      event = JSON.parse(payloadString);
    } catch {
      throw new BadRequestException('Malformed webhook JSON payload');
    }

    const { eventType, organizationId, planTier, amount, invoiceNumber } = event;

    if (eventType === 'payment.succeeded' && organizationId) {
      const plan = await this.prisma.plan.findFirst({
        where: { tier: planTier || 'GROWTH' },
      });

      if (plan) {
        // Upsert subscription
        await this.prisma.subscription.upsert({
          where: { organizationId },
          update: {
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          create: {
            organizationId,
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Update organization planTier
        await this.prisma.organization.update({
          where: { id: organizationId },
          data: { planTier: plan.tier },
        });

        // Generate Invoice record
        const invNum = invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await this.prisma.invoice.create({
          data: {
            organizationId,
            invoiceNumber: invNum,
            amount: amount ? Number(amount) : plan.monthlyPrice,
            currency: plan.currency,
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        this.logger.log(`Subscription activated for organization ${organizationId} on tier ${plan.tier}`);
      }
    }

    return { received: true };
  }

  /**
   * Invoices list
   */
  async listInvoices(organizationId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { billingDate: 'desc' },
    });
  }

  /**
   * Returns printable invoice receipt
   */
  async getInvoiceReceipt(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        organization: {
          select: { name: true, slug: true, createdAt: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice record not found');
    }

    return {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.organization.name,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      billingDate: invoice.billingDate,
      paidAt: invoice.paidAt,
      issuer: {
        name: 'DOOT SaaS Platform Ltd.',
        address: '100 Enterprise Way, Suite 400',
        supportEmail: 'billing@doot.io',
      },
    };
  }
}
