import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService, AiConfigDto } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ITenantContext } from '@doot/shared';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get AI assistant configuration and status' })
  async getConfig(@CurrentTenant() tenant: ITenantContext) {
    return this.aiService.getConfig(tenant.organizationId);
  }

  @Post('config')
  @ApiOperation({ summary: 'Save AI assistant configuration and encrypted API keys' })
  async saveConfig(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: AiConfigDto,
  ) {
    return this.aiService.saveConfig(tenant.organizationId, body);
  }

  @Post('suggest-reply')
  @ApiOperation({ summary: 'Generate drafted response for inbox conversation' })
  async suggestReply(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: { conversationId: string; contextHistory: { direction: string; text: string }[] },
  ) {
    return this.aiService.suggestReply(
      tenant.organizationId,
      body.conversationId,
      body.contextHistory || [],
    );
  }
}
