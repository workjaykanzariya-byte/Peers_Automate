import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queues/queue.service';
import { normalizePhoneNumber } from './phone-utils';
import { sanitizeCsvCell } from './csv-utils';
import { parse } from 'csv-parse/sync';
import { ImportStatus } from '@doot/shared';

export interface CsvImportMappingDto {
  filename: string;
  csvContent: string;
  phoneColumn: string;
  firstNameColumn?: string;
  lastNameColumn?: string;
  emailColumn?: string;
  companyColumn?: string;
  duplicatePolicy: 'SKIP' | 'OVERWRITE' | 'MERGE_TAGS';
  defaultTagIds?: string[];
  defaultGroupId?: string;
}

@Injectable()
export class ContactImportsService {
  private readonly logger = new Logger(ContactImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Previews CSV columns and the first 5 sample rows for user mapping
   */
  previewCsv(csvContent: string) {
    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV file content is empty');
    }

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        to_line: 6, // Header + 5 preview rows
      });

      if (!records || records.length === 0) {
        throw new BadRequestException('Could not detect header or data rows in CSV');
      }

      const columns = Object.keys(records[0]);
      return {
        columns,
        sampleRows: records,
        detectedRowCount: records.length,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse CSV: ${err.message}`);
    }
  }

  /**
   * Executes chunked CSV import and creates audit history
   */
  async processImport(organizationId: string, userId: string, dto: CsvImportMappingDto) {
    let records: any[] = [];
    try {
      records = parse(dto.csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse CSV file: ${err.message}`);
    }

    if (records.length === 0) {
      throw new BadRequestException('No data rows found in CSV');
    }

    // Create import record
    const importRecord = await this.prisma.contactImport.create({
      data: {
        organizationId,
        filename: dto.filename || 'import.csv',
        totalRows: records.length,
        status: ImportStatus.PROCESSING,
        errorReport: [],
      },
    });

    // Chunk size 50 rows per batch
    const CHUNK_SIZE = 50;
    let importedRows = 0;
    let failedRows = 0;
    const errors: { row: number; phone: string; reason: string }[] = [];

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const rowIndex = i + j + 1;
        const row = chunk[j];

        const rawPhone = row[dto.phoneColumn];
        if (!rawPhone) {
          failedRows++;
          errors.push({ row: rowIndex, phone: '', reason: 'Missing phone number column value' });
          continue;
        }

        const normalized = normalizePhoneNumber(rawPhone);
        if (!normalized.isValid) {
          failedRows++;
          errors.push({ row: rowIndex, phone: rawPhone, reason: 'Invalid international phone format' });
          continue;
        }

        const firstName = dto.firstNameColumn ? row[dto.firstNameColumn] : undefined;
        const lastName = dto.lastNameColumn ? row[dto.lastNameColumn] : undefined;
        const email = dto.emailColumn ? row[dto.emailColumn] : undefined;
        const companyName = dto.companyColumn ? row[dto.companyColumn] : undefined;

        try {
          const existing = await this.prisma.contact.findUnique({
            where: {
              organizationId_phone: {
                organizationId,
                phone: normalized.e164,
              },
            },
          });

          if (existing) {
            if (dto.duplicatePolicy === 'SKIP') {
              failedRows++;
              errors.push({ row: rowIndex, phone: normalized.e164, reason: 'Duplicate phone skipped per policy' });
              continue;
            } else if (dto.duplicatePolicy === 'OVERWRITE') {
              await this.prisma.contact.update({
                where: { id: existing.id },
                data: {
                  firstName: firstName || existing.firstName,
                  lastName: lastName || existing.lastName,
                  email: email || existing.email,
                  companyName: companyName || existing.companyName,
                },
              });
              importedRows++;
            } else {
              // MERGE_TAGS
              importedRows++;
            }
          } else {
            const newContact = await this.prisma.contact.create({
              data: {
                organizationId,
                phone: normalized.e164,
                firstName,
                lastName,
                email,
                companyName,
                leadStatus: 'NEW',
                leadSource: `CSV Import: ${dto.filename}`,
              },
            });

            // Default tags
            if (dto.defaultTagIds) {
              for (const tagId of dto.defaultTagIds) {
                await this.prisma.contactTag.create({
                  data: { contactId: newContact.id, tagId },
                });
              }
            }

            // Default group
            if (dto.defaultGroupId) {
              await this.prisma.contactGroupMember.create({
                data: { contactId: newContact.id, groupId: dto.defaultGroupId },
              });
            }

            importedRows++;
          }
        } catch (err: any) {
          failedRows++;
          errors.push({ row: rowIndex, phone: normalized.e164, reason: err.message });
        }
      }
    }

    // Update Import record with final status
    const completedImport = await this.prisma.contactImport.update({
      where: { id: importRecord.id },
      data: {
        importedRows,
        failedRows,
        status: failedRows === records.length ? ImportStatus.FAILED : ImportStatus.COMPLETED,
        errorReport: errors,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'IMPORT_CONTACTS_CSV',
        resource: 'contact_import',
        resourceId: completedImport.id,
        metadata: {
          totalRows: records.length,
          importedRows,
          failedRows,
          filename: dto.filename,
        },
      },
    });

    return completedImport;
  }

  async listImports(organizationId: string) {
    return this.prisma.contactImport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getErrorReportCsv(organizationId: string, importId: string): Promise<string> {
    const importRecord = await this.prisma.contactImport.findFirst({
      where: { id: importId, organizationId },
    });

    if (!importRecord) {
      throw new NotFoundException('Import record not found');
    }

    const errors = (importRecord.errorReport as any[]) || [];
    const headers = ['Row Number', 'Phone', 'Failure Reason'];
    const rows = errors.map((e) => [
      sanitizeCsvCell(e.row),
      sanitizeCsvCell(e.phone),
      sanitizeCsvCell(e.reason),
    ]);

    return [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  }
}
