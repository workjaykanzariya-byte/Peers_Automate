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
import { TemplatesService, CreateTemplateDto } from './templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext, TemplateCategory, TemplateStatus } from '@doot/shared';

@ApiTags('WhatsApp Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter approved WhatsApp message templates' })
  async listTemplates(
    @CurrentTenant() tenant: ITenantContext,
    @Query('search') search?: string,
    @Query('category') category?: TemplateCategory,
    @Query('status') status?: TemplateStatus,
  ) {
    return this.templatesService.listTemplates(tenant.organizationId, {
      search,
      category,
      status,
    });
  }

  @Post('sync')
  @ApiOperation({ summary: 'Synchronize templates from connected Meta WhatsApp Business Account' })
  async syncTemplates(@CurrentTenant() tenant: ITenantContext) {
    return this.templatesService.syncTemplates(tenant.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full template components and variable specifications' })
  async getTemplate(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.templatesService.getTemplate(tenant.organizationId, id);
  }

  @Post()
  @Post('draft')
  @ApiOperation({ summary: 'Author and submit new template with components' })
  async createTemplate(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(tenant.organizationId, user.id, dto);
  }
}
