import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IAuthUser, ITenantContext } from '@doot/shared';

@ApiTags('Billing & Subscriptions')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List public commercial subscription plans' })
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('razorpay/config')
  @ApiOperation({ summary: 'Get public Razorpay client configuration' })
  async getRazorpayConfig() {
    return this.billingService.getRazorpayPublicConfig();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Get('subscription')
  @ApiOperation({ summary: 'Get current tenant subscription & plan limits' })
  async getSubscription(@CurrentTenant() tenant: ITenantContext) {
    return this.billingService.getSubscription(tenant.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Patch('subscription/auto-renew')
  @ApiOperation({ summary: 'Enable or disable auto-renew on current subscription' })
  async toggleAutoRenew(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: { cancelAtPeriodEnd: boolean },
  ) {
    return this.billingService.toggleAutoRenew(tenant.organizationId, body.cancelAtPeriodEnd);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Post('razorpay/order')
  @ApiOperation({ summary: 'Create Razorpay order for subscription payment' })
  async createRazorpayOrder(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() body: { planId: string; billingCycle?: 'MONTHLY' | 'ANNUAL' },
  ) {
    return this.billingService.createRazorpayOrder(
      tenant.organizationId,
      user.id,
      body.planId,
      body.billingCycle || 'MONTHLY',
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Post('razorpay/verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature and activate workspace' })
  async verifyRazorpayPayment(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body()
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature?: string;
      planId: string;
      billingCycle: 'MONTHLY' | 'ANNUAL';
    },
  ) {
    return this.billingService.verifyRazorpayPayment(
      tenant.organizationId,
      user.id,
      body,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Inbound payment provider webhook with HMAC signature' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') razorpaySig?: string,
    @Headers('stripe-signature') stripeSig?: string,
  ) {
    const signature = razorpaySig || stripeSig || '';
    return this.billingService.handlePaymentWebhook(JSON.stringify(payload), signature);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Get('invoices')
  @ApiOperation({ summary: 'List customer invoice payment receipts' })
  async listInvoices(@CurrentTenant() tenant: ITenantContext) {
    return this.billingService.listInvoices(tenant.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Get('invoices/:id/receipt')
  @ApiOperation({ summary: 'Download or view printable invoice receipt' })
  async getInvoiceReceipt(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.billingService.getInvoiceReceipt(tenant.organizationId, id);
  }
}
