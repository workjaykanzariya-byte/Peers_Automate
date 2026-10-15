import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService, CreateWebhookEndpointDto } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext } from '@doot/shared';

@ApiTags('Webhooks & Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('endpoints')
  @ApiOperation({ summary: 'List tenant outbound webhook endpoints' })
  async listEndpoints(@CurrentTenant() tenant: ITenantContext) {
    return this.webhooksService.listEndpoints(tenant.organizationId);
  }

  @Post('endpoints')
  @ApiOperation({ summary: 'Register new outbound webhook destination with SSRF validation' })
  async createEndpoint(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: CreateWebhookEndpointDto,
  ) {
    return this.webhooksService.createEndpoint(tenant.organizationId, user.id, dto);
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Remove outbound webhook endpoint' })
  async deleteEndpoint(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Param('id') id: string,
  ) {
    return this.webhooksService.deleteEndpoint(tenant.organizationId, user.id, id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Paginated delivery logs for outbound webhook notifications' })
  async listLogs(
    @CurrentTenant() tenant: ITenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 25;
    return this.webhooksService.listDeliveryLogs(tenant.organizationId, p, l);
  }

  @Post('logs/:id/retry')
  @ApiOperation({ summary: 'Retry delivering a webhook notification' })
  async retryDelivery(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') logId: string,
  ) {
    return this.webhooksService.retryDelivery(tenant.organizationId, logId);
  }
}
