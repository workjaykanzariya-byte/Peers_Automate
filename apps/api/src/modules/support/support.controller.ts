import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService, CreateTicketDto } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IAuthUser, ITenantContext } from '@doot/shared';

@ApiTags('Support Tickets & Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List customer or platform support tickets' })
  async listTickets(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Query('status') status?: string,
  ) {
    return this.supportService.listTickets(tenant.organizationId, user, status);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Submit new support ticket' })
  async createTicket(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() body: CreateTicketDto,
  ) {
    return this.supportService.createTicket(tenant.organizationId, user.id, body);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details with conversation thread' })
  async getTicket(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicket(tenant.organizationId, id, user);
  }

  @Post('tickets/:id/comments')
  @ApiOperation({ summary: 'Add reply or internal staff comment to ticket' })
  async addComment(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Param('id') id: string,
    @Body() body: { content: string; isInternalNote?: boolean },
  ) {
    return this.supportService.addComment(
      tenant.organizationId,
      id,
      user.id,
      body.content,
      user.isPlatformAdmin ? body.isInternalNote : false,
    );
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket resolution status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.supportService.updateTicketStatus(id, status);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List in-app system notifications for active organization' })
  async getNotifications(@CurrentTenant() tenant: ITenantContext) {
    return this.supportService.getNotifications(tenant.organizationId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark in-app notification as read' })
  async markNotificationRead(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.supportService.markNotificationRead(tenant.organizationId, id);
  }
}
