import { Module, forwardRef } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { AuthModule } from '../auth/auth.module';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [AuthModule, forwardRef(() => MetaModule)],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
