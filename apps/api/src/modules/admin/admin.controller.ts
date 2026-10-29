import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
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

  @Post('organizations')
  @ApiOperation({ summary: 'Platform Owner: Create new customer organization workspace with initial owner user and credentials' })
  async createOrganization(
    @Body() dto: any,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.createOrganization(dto, user.id);
  }

  @Patch('organizations/:orgId')
  @Put('organizations/:orgId')
  @ApiOperation({ summary: 'Platform Owner: Update customer organization details, settings, and relay webhooks' })
  async updateOrganization(
    @Param('orgId') orgId: string,
    @Body() dto: any,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.updateOrganization(orgId, dto, user.id);
  }

  @Delete('organizations/:orgId')
  @ApiOperation({ summary: 'Platform Owner: Delete customer organization workspace and its assets' })
  async deleteOrganization(
    @Param('orgId') orgId: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.deleteOrganization(orgId, user.id);
  }

  @Post('clean-demo-access')
  @ApiOperation({ summary: 'Platform Owner: Purge all demo/seed non-owner logins, leaving strictly owner access' })
  async cleanDemoAccess(@CurrentUser() user: IAuthUser) {
    return this.adminService.cleanDemoAccounts(user.id);
  }

  @Post('organizations/:orgId/webhooks')
  @ApiOperation({ summary: 'Platform Owner: Register dynamic external outbound webhook relay for organization' })
  async createOrgWebhook(
    @Param('orgId') orgId: string,
    @Body() dto: any,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.createOrgWebhook(orgId, dto, user.id);
  }

  @Patch('organizations/:orgId/webhooks/:webhookId')
  @Put('organizations/:orgId/webhooks/:webhookId')
  @ApiOperation({ summary: 'Platform Owner: Update dynamic external outbound webhook relay' })
  async updateOrgWebhook(
    @Param('orgId') orgId: string,
    @Param('webhookId') webhookId: string,
    @Body() dto: any,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.updateOrgWebhook(orgId, webhookId, dto, user.id);
  }

  @Delete('organizations/:orgId/webhooks/:webhookId')
  @ApiOperation({ summary: 'Platform Owner: Remove dynamic external outbound webhook relay' })
  async deleteOrgWebhook(
    @Param('orgId') orgId: string,
    @Param('webhookId') webhookId: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.deleteOrgWebhook(orgId, webhookId, user.id);
  }

  @Post('organizations/:orgId/webhooks/:webhookId/test')
  @ApiOperation({ summary: 'Platform Owner: Trigger test event payload to external webhook relay' })
  async testOrgWebhook(
    @Param('orgId') orgId: string,
    @Param('webhookId') webhookId: string,
  ) {
    return this.adminService.testOrgWebhook(orgId, webhookId);
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

  @Patch('organizations/:orgId/phone-numbers/:phoneId')
  @ApiOperation({ summary: 'Platform admin update customer organization WhatsApp integration asset and credentials' })
  async updateOrgIntegration(
    @Param('orgId') orgId: string,
    @Param('phoneId') phoneId: string,
    @Body() dto: any,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.updateOrganizationIntegration(orgId, phoneId, dto, user.id);
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

  @Post('plans')
  @ApiOperation({ summary: 'Platform Owner: Create new subscription plan' })
  async createPlan(@Body() data: any) {
    return this.adminService.createPlan(data);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update commercial plan limits and pricing' })
  async updatePlan(@Param('id') planId: string, @Body() data: any) {
    return this.adminService.updatePlan(planId, data);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Platform Owner: Delete or deactivate subscription plan' })
  async deletePlan(@Param('id') planId: string) {
    return this.adminService.deletePlan(planId);
  }

  @Get('settings/razorpay')
  @ApiOperation({ summary: 'Platform Owner: Get configured Razorpay Gateway parameters' })
  async getRazorpaySettings() {
    return this.adminService.getRazorpaySettings();
  }

  @Post('settings/razorpay')
  @ApiOperation({ summary: 'Platform Owner: Save / update Razorpay Key ID and Key Secret' })
  async saveRazorpaySettings(@Body() dto: any) {
    return this.adminService.saveRazorpaySettings(dto);
  }

  @Post('organizations/:id/activate-subscription')
  @ApiOperation({ summary: 'Platform Owner: Manually mark customer organization subscription as PAID / ACTIVE' })
  async activateOrgSubscription(
    @Param('id') orgId: string,
    @Body() dto: { planTier?: string; planId?: string; months?: number; reason?: string },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.adminService.activateOrgSubscription(orgId, dto, user.id);
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

