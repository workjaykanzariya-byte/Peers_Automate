import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Global Retailers Ltd' })
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  @MaxLength(255)
  name: string;
}
