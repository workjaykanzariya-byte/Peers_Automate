import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { MetaModule } from '../meta/meta.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, MetaModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
