import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectWabaDto {
  @ApiProperty({ example: 'biz_1234567890' })
  @IsString()
  @IsNotEmpty()
  metaBusinessId: string;

  @ApiProperty({ example: 'waba_9876543210' })
  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @ApiProperty({ example: 'Official Customer Care Account' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'EAAB...user_or_system_token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ example: 'phone_1029384756' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @ApiProperty({ example: '+1 (555) 019-2834' })
  @IsString()
  @IsNotEmpty()
  displayPhoneNumber: string;

  @ApiProperty({ example: 'Acme Official' })
  @IsString()
  @IsOptional()
  verifiedName?: string;
}

export class SendTestMessageDto {
  @ApiProperty({ example: 'phone_1029384756' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @IsNotEmpty()
  recipientPhone: string;
}
