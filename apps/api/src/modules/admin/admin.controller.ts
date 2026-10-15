import {
  Controller,
  Get,
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

  @Get('organizations')
  @ApiOperation({ summary: 'List all customer organizations across the platform' })
  async listOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listOrganizations(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
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
}
