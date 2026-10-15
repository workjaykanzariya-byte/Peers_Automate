import { Controller, Get, Post, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessengerService, ConnectMessengerPageDto } from './messenger.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ITenantContext } from '@doot/shared';

@ApiTags('Facebook Messenger')
@Controller('messenger')
export class MessengerController {
  constructor(private readonly messengerService: MessengerService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Get('pages')
  @ApiOperation({ summary: 'List connected Facebook Pages' })
  async listPages(@CurrentTenant() tenant: ITenantContext) {
    return this.messengerService.listPages(tenant.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Post('pages/connect')
  @ApiOperation({ summary: 'Connect Facebook Page with encrypted token' })
  async connectPage(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: ConnectMessengerPageDto,
  ) {
    return this.messengerService.connectPage(tenant.organizationId, body);
  }

  @Get('webhook')
  @ApiOperation({ summary: 'Meta Messenger webhook challenge handshake' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.messengerService.verifyWebhookHandshake(mode, token, challenge);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive incoming Messenger message events' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    return this.messengerService.processWebhookEvent(JSON.stringify(payload), signature);
  }
}
