import { Controller, Get, Post, Body, Param, Headers, UseGuards } from '@nestjs/common';
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Get('subscription')
  @ApiOperation({ summary: 'Get current tenant subscription & plan limits' })
  async getSubscription(@CurrentTenant() tenant: ITenantContext) {
    return this.billingService.getSubscription(tenant.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Post('checkout')
  @ApiOperation({ summary: 'Initiate subscription checkout session' })
  async createCheckout(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() body: { planId: string; billingCycle?: 'MONTHLY' | 'ANNUAL' },
  ) {
    return this.billingService.createCheckoutSession(
      tenant.organizationId,
      user.id,
      body.planId,
      body.billingCycle,
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
