import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService, CreateCampaignDto } from './campaigns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext, CampaignStatus } from '@doot/shared';

@ApiTags('Campaigns & Bulk Broadcasting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List broadcast campaigns for tenant' })
  async listCampaigns(
    @CurrentTenant() tenant: ITenantContext,
    @Query('status') status?: CampaignStatus,
    @Query('isBulkCsv') isBulkCsv?: string,
  ) {
    const isBulk = isBulkCsv !== undefined ? isBulkCsv === 'true' : undefined;
    return this.campaignsService.listCampaigns(tenant.organizationId, {
      status,
      isBulkCsv: isBulk,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details and recipient delivery metrics' })
  async getCampaign(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getCampaign(tenant.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create and launch/schedule WhatsApp broadcast campaign' })
  async createCampaign(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(tenant.organizationId, user.id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel active or queued campaign' })
  async cancelCampaign(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.campaignsService.cancelCampaign(tenant.organizationId, id);
  }
}
