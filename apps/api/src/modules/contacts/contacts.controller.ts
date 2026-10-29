import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ContactsService } from './contacts.service';
import { TaxonomyService } from './taxonomy.service';
import { ContactImportsService, CsvImportMappingDto } from './contact-imports.service';
import { LeadsService } from '../leads/leads.service';
import { CreateContactDto, UpdateContactDto, BulkActionDto, ContactQueryDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IAuthUser, ITenantContext, LeadStatus } from '@doot/shared';

@ApiTags('Contacts & Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly taxonomyService: TaxonomyService,
    private readonly importsService: ContactImportsService,
    private readonly leadsService: LeadsService,
  ) {}

  // ----------------------------------------------------
  // Contacts CRUD & Directory
  // ----------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Paginated contact directory with search and tag filters' })
  async listContacts(
    @CurrentTenant() tenant: ITenantContext,
    @Query() query: ContactQueryDto,
  ) {
    return this.contactsService.listContacts(tenant.organizationId, query);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export organization contacts to formula-sanitized CSV' })
  async exportContactsCsv(
    @CurrentTenant() tenant: ITenantContext,
    @Res() res: Response,
  ) {
    const csvData = await this.contactsService.exportContactsCsv(tenant.organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts-export.csv"');
    return res.status(HttpStatus.OK).send(csvData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact profile with tags, groups and recent chat history' })
  async getContact(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.contactsService.getContact(tenant.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new contact with E.164 phone normalization' })
  async createContact(
    @CurrentTenant() tenant: ITenantContext,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.createContact(tenant.organizationId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contact details' })
  async updateContact(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(tenant.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact from workspace' })
  async deleteContact(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.contactsService.deleteContact(tenant.organizationId, id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk assign tags, staff owner, or lead status' })
  async bulkActions(
    @CurrentTenant() tenant: ITenantContext,
    @Body() dto: BulkActionDto,
  ) {
    return this.contactsService.bulkActions(tenant.organizationId, dto);
  }

  // ----------------------------------------------------
  // Tags & Groups
  // ----------------------------------------------------
  @Get('taxonomy/tags')
  @ApiOperation({ summary: 'List organization tags' })
  async listTags(@CurrentTenant() tenant: ITenantContext) {
    return this.taxonomyService.listTags(tenant.organizationId);
  }

  @Post('taxonomy/tags')
  @ApiOperation({ summary: 'Create new tag' })
  async createTag(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: { name: string; color?: string },
  ) {
    return this.taxonomyService.createTag(tenant.organizationId, body.name, body.color);
  }

  @Delete('taxonomy/tags/:id')
  @ApiOperation({ summary: 'Delete tag' })
  async deleteTag(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.taxonomyService.deleteTag(tenant.organizationId, id);
  }

  @Get('taxonomy/groups')
  @ApiOperation({ summary: 'List organization contact groups' })
  async listGroups(@CurrentTenant() tenant: ITenantContext) {
    return this.taxonomyService.listGroups(tenant.organizationId);
  }

  @Post('taxonomy/groups')
  @ApiOperation({ summary: 'Create contact group' })
  async createGroup(
    @CurrentTenant() tenant: ITenantContext,
    @Body() body: { name: string; description?: string },
  ) {
    return this.taxonomyService.createGroup(tenant.organizationId, body.name, body.description);
  }

  @Delete('taxonomy/groups/:id')
  @ApiOperation({ summary: 'Delete contact group' })
  async deleteGroup(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
  ) {
    return this.taxonomyService.deleteGroup(tenant.organizationId, id);
  }

  // ----------------------------------------------------
  // CSV Import Pipeline
  // ----------------------------------------------------
  @Post('imports/preview')
  @ApiOperation({ summary: 'Preview CSV columns and sample records before mapping' })
  async previewCsv(@Body() body: { csvContent: string }) {
    return this.importsService.previewCsv(body.csvContent);
  }

  @Post('imports/process')
  @ApiOperation({ summary: 'Process asynchronous chunked CSV contact import' })
  async processImport(
    @CurrentTenant() tenant: ITenantContext,
    @CurrentUser() user: IAuthUser,
    @Body() dto: CsvImportMappingDto,
  ) {
    return this.importsService.processImport(tenant.organizationId, user.id, dto);
  }

  @Get('imports/history')
  @ApiOperation({ summary: 'List import history and status reports' })
  async listImports(@CurrentTenant() tenant: ITenantContext) {
    return this.importsService.listImports(tenant.organizationId);
  }

  @Get('imports/:id/error-report')
  @ApiOperation({ summary: 'Download CSV error report for failed import rows' })
  async downloadErrorReport(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csvContent = await this.importsService.getErrorReportCsv(tenant.organizationId, id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="import-errors.csv"');
    return res.status(HttpStatus.OK).send(csvContent);
  }
}

@ApiTags('Leads Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('pipeline')
  @ApiOperation({ summary: 'Get Kanban pipeline boards grouped by stage' })
  async getPipeline(@CurrentTenant() tenant: ITenantContext) {
    return this.leadsService.getPipeline(tenant.organizationId);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Transition lead stage, priority or update follow-up note' })
  async updateLeadStage(
    @CurrentTenant() tenant: ITenantContext,
    @Param('id') contactId: string,
    @Body() body: { stage: LeadStatus; notes?: string; priority?: string; followUpDate?: string; dealValue?: number },
  ) {
    return this.leadsService.updateLeadStage(
      tenant.organizationId,
      contactId,
      body.stage,
      body.notes,
      body.priority,
      body.followUpDate,
      body.dealValue,
    );
  }
}
