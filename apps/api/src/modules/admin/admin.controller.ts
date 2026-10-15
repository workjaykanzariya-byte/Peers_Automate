import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IAuthUser, OrganizationStatus } from '@doot/shared';

@ApiTags('Platform Owner Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform operational overview and KPI metrics' })
  async getDashboard() {
    return this.adminService.getPlatformStats();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform operational overview and KPI metrics (stats alias)' })
  async getStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all customer organizations across the platform' })
  async listOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listOrganizations(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      search || '',
    );
  }

  @Patch('organizations/:id/status')
  @ApiOperation({ summary: 'Suspend or reactivate customer organization workspace' })
  async updateOrgStatus(
    @Param('id') orgId: string,
    @Body() body: { status: OrganizationStatus; reason: string },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.updateOrganizationStatus(
      orgId,
      body.status,
      body.reason,
      user.id,
    );
  }

  @Post('organizations/:id/suspend')
  @ApiOperation({ summary: 'Suspend customer organization workspace' })
  async suspendOrg(
    @Param('id') orgId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.updateOrganizationStatus(
      orgId,
      OrganizationStatus.SUSPENDED,
      body.reason,
      user.id,
    );
  }

  @Post('organizations/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate customer organization workspace' })
  async reactivateOrg(
    @Param('id') orgId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.updateOrganizationStatus(
      orgId,
      OrganizationStatus.ACTIVE,
      body.reason,
      user.id,
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'List users across all platform organizations' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search || '',
    );
  }

  @Get('plans')
  @ApiOperation({ summary: 'List commercial subscription plan definitions' })
  async listPlans() {
    return this.adminService.listPlans();
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update commercial plan limits and pricing' })
  async updatePlan(@Param('id') planId: string, @Body() data: any) {
    return this.adminService.updatePlan(planId, data);
  }

  @Get('queues')
  @ApiOperation({ summary: 'BullMQ queues & background worker health' })
  async getQueueHealth() {
    return this.adminService.getQueueHealth();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Platform-wide security audit trail' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get operational detail breakdown for a single customer organization' })
  async getOrganizationDetail(@Param('id') id: string) {
    return this.adminService.getOrganizationDetail(id);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Platform-wide searchable message audit log' })
  async listMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.adminService.listMessages(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
      status,
      search,
      organizationId,
    );
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Platform-wide broadcast campaigns registry' })
  async listCampaigns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.adminService.listCampaigns(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
      organizationId,
    );
  }

  @Get('webhook-logs')
  @ApiOperation({ summary: 'Platform-wide outbound webhook delivery logs' })
  async listWebhookLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('statusType') statusType?: 'ALL' | 'SUCCESS' | 'FAILED',
  ) {
    return this.adminService.listWebhookLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
      statusType,
    );
  }
}

