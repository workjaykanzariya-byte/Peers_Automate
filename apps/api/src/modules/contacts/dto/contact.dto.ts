import { IsNotEmpty, IsString, IsOptional, IsEmail, IsArray, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@doot/shared';

export class CreateContactDto {
  @ApiProperty({ example: '+1 (555) 123-4567', description: 'Raw or formatted phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john.smith@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Acme Logistics' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: LeadStatus, default: LeadStatus.NEW })
  @IsEnum(LeadStatus)
  @IsOptional()
  leadStatus?: LeadStatus;

  @ApiPropertyOptional({ example: 'Website Demo' })
  @IsString()
  @IsOptional()
  leadSource?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: '2026-11-01T10:00:00Z' })
  @IsString()
  @IsOptional()
  followUpDate?: string;

  @ApiPropertyOptional({ example: 'Interested in enterprise bulk messaging tier.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  groupIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  customFields?: Record<string, any>;
}

export class UpdateContactDto extends CreateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  isBlocked?: boolean;
}

export class BulkActionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsNotEmpty()
  contactIds: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  groupIds?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  @IsOptional()
  leadStatus?: LeadStatus;
}

export class ContactQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  @IsOptional()
  leadStatus?: LeadStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tagId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 25;
}
