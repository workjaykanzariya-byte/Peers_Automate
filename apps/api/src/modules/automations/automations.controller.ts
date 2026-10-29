import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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

  @Get('templates')
  @ApiOperation({ summary: 'List pre-trained bot flow templates' })
  listTemplates() {
    return this.automationsService.listTemplates();
  }

  @Post('templates/install')
  @ApiOperation({ summary: 'Install and activate pre-trained bot flow' })
  async installTemplate(
    @CurrentTenant() tenant: ITenantContext,
    @Body('templateKey') templateKey: string,
  ) {
    return this.automationsService.installTemplate(tenant.organizationId, templateKey);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bot flow' })
  async deleteFlow(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.automationsService.deleteFlow(tenant.organizationId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate bot flow' })
  async setStatus(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.automationsService.toggleActive(tenant.organizationId, id, isActive);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle active status of bot flow' })
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
    @Body() body: { messageText: string; contactPhone?: string; contactName?: string },
  ) {
    return this.automationsService.simulateFlow(tenant.organizationId, id, body);
  }
}
