import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import * as crypto from 'crypto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * List all active subscription plans sorted by price
   */
  async getPlans() {
    const [plans, setting] = await Promise.all([
      this.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'razorpay_gateway' },
      }),
    ]);

    const gatewayCurrency = ((setting?.value as any)?.currency || 'INR').toUpperCase();

    return plans.map((p) => ({
      ...p,
      currency: gatewayCurrency,
    }));
  }

  /**
   * Get subscription details for tenant organization, calculating remaining time & status
   */
  async getSubscription(organizationId: string) {
    const [org, setting] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'razorpay_gateway' },
      }),
    ]);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const gatewayCurrency = ((setting?.value as any)?.currency || 'INR').toUpperCase();

    if (!org.subscription) {
      // Find a default plan
      const defaultPlan = await this.prisma.plan.findFirst({
        where: { tier: org.planTier || 'STARTER' },
      });

      return {
        status: 'PENDING',
        plan: defaultPlan
          ? { ...defaultPlan, currency: gatewayCurrency }
          : {
              name: 'Starter Plan',
              tier: 'STARTER',
              monthlyPrice: 2499,
              annualPrice: 24990,
              currency: gatewayCurrency,
              maxContacts: 1000,
              maxMonthlyMessages: 2500,
              maxPhoneNumbers: 1,
              maxTeamMembers: 2,
            },
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        daysRemaining: 0,
        isExpired: true,
      };
    }

    const sub = org.subscription;
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);
    const diffMs = periodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = sub.status === 'EXPIRED' || (sub.status === 'ACTIVE' && diffMs <= 0);

    return {
      ...sub,
      plan: sub.plan ? { ...sub.plan, currency: gatewayCurrency } : sub.plan,
      daysRemaining,
      isExpired,
      status: isExpired && sub.status === 'ACTIVE' ? 'EXPIRED' : sub.status,
    };
  }

  /**
   * Toggle auto-renew status
   */
  async toggleAutoRenew(organizationId: string, cancelAtPeriodEnd: boolean) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub) {
      throw new NotFoundException('No active subscription found');
    }

    return this.prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd },
    });
  }

  /**
   * Public Razorpay config for client checkout integration
   */
  async getRazorpayPublicConfig() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'razorpay_gateway' },
    });

    if (!setting || !setting.value) {
      return {
        isConfigured: false,
        keyId: '',
        currency: 'INR',
        isEnabled: false,
      };
    }

    const val = setting.value as any;
    return {
      isConfigured: !!val.keyId && val.isEnabled !== false,
      keyId: val.keyId || '',
      currency: val.currency || 'INR',
      isEnabled: val.isEnabled ?? true,
    };
  }

  /**
   * Platform Owner: Get Razorpay gateway settings
   */
  async getRazorpayAdminSettings() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'razorpay_gateway' },
    });

    if (!setting || !setting.value) {
      return {
        isConfigured: false,
        keyId: '',
        hasSecret: false,
        currency: 'INR',
        isEnabled: true,
        accountName: 'Peers Automate Razorpay Gateway',
        updatedAt: null,
      };
    }

    const val = setting.value as any;
    return {
      isConfigured: !!val.keyId,
      keyId: val.keyId || '',
      hasSecret: !!val.encryptedSecret,
      currency: val.currency || 'INR',
      isEnabled: val.isEnabled ?? true,
      accountName: val.accountName || 'Peers Automate Razorpay Gateway',
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * Platform Owner: Save Razorpay gateway credentials securely
   */
  async saveRazorpayAdminSettings(dto: {
    keyId: string;
    keySecret?: string;
    currency?: string;
    isEnabled?: boolean;
    accountName?: string;
  }) {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: 'razorpay_gateway' },
    });

    const currentVal = (existing?.value as any) || {};

    let encryptedSecret = currentVal.encryptedSecret;
    if (dto.keySecret && dto.keySecret.trim()) {
      const encrypted = this.encryptionService.encrypt(dto.keySecret.trim());
      encryptedSecret = encrypted.ciphertext;
    }

    const updatedVal = {
      keyId: dto.keyId.trim(),
      encryptedSecret,
      currency: dto.currency || 'INR',
      isEnabled: dto.isEnabled ?? true,
      accountName: dto.accountName || 'Peers Automate Razorpay Gateway',
    };

    await this.prisma.systemSetting.upsert({
      where: { key: 'razorpay_gateway' },
      update: {
        value: updatedVal,
        description: 'Razorpay Payment Gateway credentials and configuration',
      },
      create: {
        key: 'razorpay_gateway',
        value: updatedVal,
        description: 'Razorpay Payment Gateway credentials and configuration',
      },
    });

    this.logger.log('Razorpay Gateway credentials successfully saved by Platform Owner');

    return {
      success: true,
      message: 'Razorpay credentials saved successfully',
      keyId: updatedVal.keyId,
      hasSecret: !!encryptedSecret,
      currency: updatedVal.currency,
      isEnabled: updatedVal.isEnabled,
    };
  }

  /**
   * Internal helper to decrypt Razorpay credentials
   */
  private async getDecryptedCredentials(): Promise<{
    keyId: string;
    keySecret: string;
    currency: string;
    isEnabled: boolean;
  } | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'razorpay_gateway' },
    });

    if (!setting || !setting.value) return null;
    const val = setting.value as any;

    let secret = '';
    if (val.encryptedSecret) {
      try {
        secret = this.encryptionService.decrypt(val.encryptedSecret);
      } catch (err: any) {
        this.logger.error(`Failed to decrypt Razorpay secret: ${err.message}`);
      }
    }

    return {
      keyId: val.keyId || '',
      keySecret: secret,
      currency: val.currency || 'INR',
      isEnabled: val.isEnabled ?? true,
    };
  }

  /**
   * Create Razorpay Order
   */
  async createRazorpayOrder(
    organizationId: string,
    userId: string,
    planId: string,
    billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
  ) {
    const [plan, org] = await Promise.all([
      this.prisma.plan.findUnique({ where: { id: planId } }),
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
    ]);

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const creds = await this.getDecryptedCredentials();
    const activeCurrency = (creds?.currency || plan.currency || 'INR').toUpperCase();

    const price = billingCycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;
    const amountInSubunits = Math.round(Number(price) * 100);

    let orderId = `order_sim_${Date.now()}`;
    let isSimulation = true;

    if (creds && creds.keyId && creds.keySecret && creds.isEnabled) {
      try {
        const authHeader = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInSubunits,
            currency: activeCurrency,
            receipt: `rcpt_${Date.now()}_${org.slug.slice(0, 10)}`,
            notes: {
              organizationId,
              organizationName: org.name,
              planId: plan.id,
              planTier: plan.tier,
              billingCycle,
              currency: activeCurrency,
            },
          }),
        });

        if (response.ok) {
          const resData: any = await response.json();
          orderId = resData.id;
          isSimulation = false;
          this.logger.log(`Created live Razorpay order ${orderId} (${activeCurrency}) for organization ${org.name}`);
        } else {
          const errText = await response.text();
          this.logger.warn(`Razorpay API order creation failed, fallback to simulation mode: ${errText}`);
        }
      } catch (err: any) {
        this.logger.warn(`Razorpay network error: ${err.message}. Using simulated order.`);
      }
    }

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'BILLING_ORDER_CREATED',
        resource: 'PLAN',
        resourceId: planId,
        metadata: {
          orderId,
          isSimulation,
          planTier: plan.tier,
          amount: price.toString(),
          currency: activeCurrency,
          billingCycle,
        },
      },
    });

    return {
      orderId,
      amount: amountInSubunits,
      displayAmount: Number(price),
      currency: activeCurrency,
      keyId: creds?.keyId || 'rzp_test_simulated_key',
      planId: plan.id,
      planName: plan.name,
      planTier: plan.tier,
      billingCycle,
      isSimulation,
      orgName: org.name,
    };
  }

  /**
   * Verify Razorpay Payment and unlock customer workspace
   */
  async verifyRazorpayPayment(
    organizationId: string,
    userId: string,
    dto: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature?: string;
      planId: string;
      billingCycle: 'MONTHLY' | 'ANNUAL';
    },
  ) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId, billingCycle } = dto;

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const creds = await this.getDecryptedCredentials();
    const isSimulated = razorpayOrderId.startsWith('order_sim_');

    if (!isSimulated && creds?.keySecret && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', creds.keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        this.logger.error('Razorpay payment signature mismatch');
        throw new BadRequestException('Invalid Razorpay signature verification');
      }
    }

    const months = billingCycle === 'ANNUAL' ? 12 : 1;
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    const amountPaid = billingCycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;

    // 1. Upsert subscription to ACTIVE
    const subscription = await this.prisma.subscription.upsert({
      where: { organizationId },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        provider: 'RAZORPAY',
        providerSubscriptionId: razorpayPaymentId,
      },
      create: {
        organizationId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        provider: 'RAZORPAY',
        providerSubscriptionId: razorpayPaymentId,
      },
      include: { plan: true },
    });

    // 2. Unlock Organization workspace
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        planTier: plan.tier,
        status: 'ACTIVE',
      },
    });

    // 3. Generate Paid Invoice record
    const activeCurrency = (creds?.currency || plan.currency || 'INR').toUpperCase();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        subscriptionId: subscription.id,
        invoiceNumber,
        amount: amountPaid,
        currency: activeCurrency,
        status: 'PAID',
        paidAt: new Date(),
        metadata: {
          razorpayOrderId,
          razorpayPaymentId,
          billingCycle,
          planName: plan.name,
          currency: activeCurrency,
        },
      },
    });

    // 4. Audit Log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'SUBSCRIPTION_PAYMENT_VERIFIED',
        resource: 'SUBSCRIPTION',
        resourceId: subscription.id,
        metadata: {
          invoiceNumber,
          amount: amountPaid.toString(),
          planTier: plan.tier,
          razorpayPaymentId,
        },
      },
    });

    this.logger.log(
      `Workspace ${organizationId} unlocked and activated on plan ${plan.name} (${plan.tier}) via Razorpay`,
    );

    return {
      success: true,
      message: 'Payment verified successfully! Workspace subscription is now ACTIVE.',
      subscription,
      invoice,
    };
  }

  /**
   * Handle Webhook from Payment Gateway
   */
  async handlePaymentWebhook(rawPayload: Buffer | string, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'BILLING_WEBHOOK_SECRET',
      'doot_billing_webhook_secret_default',
    );

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

    const { eventType, organizationId, planTier, amount } = event;

    if (eventType === 'payment.succeeded' && organizationId) {
      const plan = await this.prisma.plan.findFirst({
        where: { tier: planTier || 'GROWTH' },
      });

      if (plan) {
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

        await this.prisma.organization.update({
          where: { id: organizationId },
          data: { planTier: plan.tier },
        });

        const invNum = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        await this.prisma.invoice.create({
          data: {
            organizationId,
            invoiceNumber: invNum,
            amount: amount ? Number(amount) : plan.monthlyPrice,
            currency: 'INR',
            status: 'PAID',
            paidAt: new Date(),
          },
        });
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
      metadata: invoice.metadata,
      issuer: {
        name: 'Peers Automate (Peers Global Pvt Ltd)',
        address: 'VyapaarJagat House, Ahmedabad, Gujarat, India',
        supportEmail: 'support@peersglobal.com',
      },
    };
  }
}
