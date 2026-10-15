import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Headers,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MetaAccountsService } from './meta-accounts.service';
import { MetaWebhookService } from './meta-webhook.service';
import { ConnectWabaDto, SendTestMessageDto } from './dto/connect-waba.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext } from '@doot/shared';

@ApiTags('Meta WhatsApp Integration')
@Controller('meta')
export class MetaController {
  constructor(
    private readonly accountsService: MetaAccountsService,
    private readonly webhookService: MetaWebhookService,
  ) {}

  // ------------------------------------------------------------------
  // 1. Tenant-Protected Endpoints (Requires Auth & Organization Context)
  // ------------------------------------------------------------------
  @Get('accounts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'List all connected Meta WhatsApp accounts and phone assets for active tenant' })
  async listAccounts(@CurrentTenant() tenant: ITenantContext) {
    return this.accountsService.listAccounts(tenant.organizationId);
  }

  @Post('accounts/connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'Connect Meta WABA and securely store encrypted credentials' })
  async connectAccount(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: ConnectWabaDto,
  ) {
    return this.accountsService.connectWaba(tenant.organizationId, user.id, dto);
  }

  @Post('accounts/test-message')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'Send diagnostic live test WhatsApp message to verify integration' })
  async sendTestMessage(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: SendTestMessageDto,
  ) {
    return this.accountsService.sendTestMessage(tenant.organizationId, user.id, dto);
  }

  @Delete('accounts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'Revoke and disconnect Meta WhatsApp integration' })
  async disconnectAccount(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Param('id') integrationId: string,
  ) {
    return this.accountsService.disconnectAccount(tenant.organizationId, user.id, integrationId);
  }

  // ------------------------------------------------------------------
  // 2. Official Meta Inbound Webhook Handshake & Notification Endpoints
  // ------------------------------------------------------------------
  @Get('webhook')
  @ApiOperation({ summary: 'Meta Webhook verification challenge handshake (hub.challenge)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifiedChallenge = this.webhookService.verifyHandshake(mode, verifyToken, challenge);
    return res.status(HttpStatus.OK).send(verifiedChallenge);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta Webhook event notifications (inbound messages & delivery statuses)' })
  async handleWebhookNotification(
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(payload);
    const isValid = this.webhookService.validateSignature(rawBody, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid X-Hub-Signature-256 signature header');
    }

    // Process events asynchronously
    await this.webhookService.processEventPayload(payload);

    return { status: 'EVENT_RECEIVED' };
  }
}
