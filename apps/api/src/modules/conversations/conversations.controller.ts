import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService, SendMessageDto } from './conversations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext, ConversationStatus } from '@doot/shared';

@ApiTags('Inbox & Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List customer conversations with unread counts and 24h window status' })
  async listConversations(
    @CurrentTenant() tenant: ITenantContext,
    @Query('status') status?: ConversationStatus,
    @Query('search') search?: string,
    @Query('assignedUserId') assignedUserId?: string,
  ) {
    return this.conversationsService.listConversations(tenant.organizationId, {
      status,
      search,
      assignedUserId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation thread and full message stream' })
  async getConversation(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.conversationsService.getConversation(tenant.organizationId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message (freeform within 24h window; template if outside window)' })
  async sendMessage(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(tenant.organizationId, user.id, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Assign conversation to agent or change conversation status' })
  async updateConversation(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Body() body: { status?: ConversationStatus; assignedUserId?: string | null },
  ) {
    return this.conversationsService.updateConversation(tenant.organizationId, id, body);
  }
}
