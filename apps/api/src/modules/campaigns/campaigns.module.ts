import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { MetaModule } from '../meta/meta.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, MetaModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
