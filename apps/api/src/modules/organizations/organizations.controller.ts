import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext } from '@doot/shared';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all organizations the authenticated user belongs to' })
  async listUserOrganizations(@CurrentUser() user: IAuthUser) {
    return this.orgsService.listUserOrganizations(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new independent tenant organization workspace' })
  async createOrganization(
    @CurrentUser() user: IAuthUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgsService.createOrganization(user.id, dto);
  }

  @Get('current')
  @UseGuards(TenantContextGuard)
  @ApiOperation({ summary: 'Get details of the currently selected organization workspace' })
  async getCurrentOrganization(@CurrentTenant() tenant: ITenantContext) {
    return this.orgsService.getOrganization(tenant.organizationId);
  }

  @Get('current/members')
  @UseGuards(TenantContextGuard)
  @ApiOperation({ summary: 'List team members in current organization workspace' })
  async getOrganizationMembers(@CurrentTenant() tenant: ITenantContext) {
    return this.orgsService.getMembers(tenant.organizationId);
  }
}
