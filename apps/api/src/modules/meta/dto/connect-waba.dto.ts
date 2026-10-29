import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectWabaDto {
  @ApiProperty({ example: 'biz_1234567890', required: false })
  @IsString()
  @IsOptional()
  metaBusinessId?: string;

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

export class UpdateWabaDto {
  @ApiProperty({ example: 'biz_1234567890', required: false })
  @IsString()
  @IsOptional()
  metaBusinessId?: string;

  @ApiProperty({ example: '1460871381832780', required: false })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiProperty({ example: '1475250733815899', required: false })
  @IsString()
  @IsOptional()
  wabaId?: string;

  @ApiProperty({ example: 'Peers Global Business Media Pvt Ltd', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'EAAB...user_or_system_token', required: false })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiProperty({ example: '1148211571702139', required: false })
  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @ApiProperty({ example: '+91 96646 20704', required: false })
  @IsString()
  @IsOptional()
  displayPhoneNumber?: string;

  @ApiProperty({ example: 'Peers Global Business Media Pvt Ltd', required: false })
  @IsString()
  @IsOptional()
  verifiedName?: string;

  @ApiProperty({ example: 'https://peersunity.com/api/v1/whatsapp/webhook', required: false })
  @IsString()
  @IsOptional()
  externalWebhookUrl?: string;

  @ApiProperty({ example: 'unity_whatsapp_webhook_verify_token_2026', required: false })
  @IsString()
  @IsOptional()
  externalWebhookToken?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isWebhookActive?: boolean;
}

export class SendTestMessageDto {
  @ApiProperty({ example: 'phone_1029384756' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiProperty({ example: 'Hello from DOOT! Real test message' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ example: 'welcome_discount_2026' })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiProperty({ example: 'en_US' })
  @IsString()
  @IsOptional()
  languageCode?: string;

  @ApiProperty({ example: { '1': 'John', '2': 'PROMO20' } })
  @IsOptional()
  variables?: Record<string, string>;

  @ApiProperty({ example: 'https://example.com/banner.jpg' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiProperty({ example: '4350730778514819', required: false })
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiProperty({ example: 'data:image/jpeg;base64,...', required: false })
  @IsString()
  @IsOptional()
  mediaBase64?: string;

  @ApiProperty({ example: 'IMAGE' })
  @IsString()
  @IsOptional()
  headerType?: string;
}
