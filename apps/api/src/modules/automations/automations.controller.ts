import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService, CreateFlowDto } from './automations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ITenantContext } from '@doot/shared';

@ApiTags('Bot Flows & Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'List customer organization automation bot flows' })
  async listFlows(@CurrentTenant() tenant: ITenantContext) {
    return this.automationsService.listFlows(tenant.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific automation bot flow definition' })
  async getFlow(@CurrentTenant() tenant: ITenantContext, @Param('id') id: string) {
    return this.automationsService.getFlow(tenant.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new bot flow with graph validation' })
  async createFlow(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: CreateFlowDto,
  ) {
    return this.automationsService.createFlow(tenant.organizationId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bot flow nodes and configuration' })
  async updateFlow(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Body() body: Partial<CreateFlowDto>,
  ) {
    return this.automationsService.updateFlow(tenant.organizationId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate bot flow' })
  async toggleActive(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.automationsService.toggleActive(tenant.organizationId, id, isActive);
  }

  @Post(':id/simulate')
  @ApiOperation({ summary: 'Simulate dry-run execution trace with sample input' })
  async simulateFlow(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Body() body: { messageText: string; contactPhone?: string },
  ) {
    return this.automationsService.simulateFlow(tenant.organizationId, id, body);
  }
}
