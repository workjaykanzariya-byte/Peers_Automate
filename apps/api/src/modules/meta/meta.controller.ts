import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { ConnectWabaDto, SendTestMessageDto, UpdateWabaDto } from './dto/connect-waba.dto';
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

  @Post('connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'Connect Meta WABA (alias)' })
  async connectAccountAlias(
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

  @Post('test-message')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'Send diagnostic live test WhatsApp message (alias)' })
  async sendTestMessageAlias(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: SendTestMessageDto,
  ) {
    return this.accountsService.sendTestMessage(tenant.organizationId, user.id, dto);
  }

  @Patch('accounts/:id')
  @Put('accounts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: 'Update Meta WhatsApp integration credentials and phone details' })
  async updateAccount(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Param('id') integrationId: string,
    @Body() dto: UpdateWabaDto,
  ) {
    return this.accountsService.updateAccount(tenant.organizationId, user.id, integrationId, dto);
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
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifiedChallenge = await this.webhookService.verifyHandshake(mode, verifyToken, challenge);
    return res.status(HttpStatus.OK).send(verifiedChallenge);
  }

  @Get('webhook/:orgId')
  @ApiOperation({ summary: 'Dedicated tenant organization Meta Webhook verification handshake' })
  async verifyOrgWebhook(
    @Param('orgId') orgId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifiedChallenge = await this.webhookService.verifyHandshake(mode, verifyToken, challenge, orgId);
    return res.status(HttpStatus.OK).send(verifiedChallenge);
  }

  @Get('webhook/:orgId/:integrationId')
  @ApiOperation({ summary: 'Dedicated integration asset Meta Webhook verification handshake' })
  async verifyIntegrationWebhook(
    @Param('orgId') orgId: string,
    @Param('integrationId') integrationId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifiedChallenge = await this.webhookService.verifyHandshake(mode, verifyToken, challenge, orgId, integrationId);
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

  @Post('webhook/:orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dedicated tenant organization Meta Webhook event intake' })
  async handleOrgWebhookNotification(
    @Param('orgId') orgId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(payload);
    const isValid = this.webhookService.validateSignature(rawBody, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid X-Hub-Signature-256 signature header');
    }

    await this.webhookService.processEventPayload(payload);
    return { status: 'EVENT_RECEIVED', organizationId: orgId };
  }

  @Post('webhook/:orgId/:integrationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dedicated connection asset Meta Webhook event intake' })
  async handleIntegrationWebhookNotification(
    @Param('orgId') orgId: string,
    @Param('integrationId') integrationId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(payload);
    const isValid = this.webhookService.validateSignature(rawBody, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid X-Hub-Signature-256 signature header');
    }

    await this.webhookService.processEventPayload(payload);
    return { status: 'EVENT_RECEIVED', organizationId: orgId, integrationId };
  }
}
