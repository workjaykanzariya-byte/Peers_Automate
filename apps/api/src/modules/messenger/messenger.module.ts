import { Module } from '@nestjs/common';
import { MessengerService } from './messenger.service';
import { MessengerController } from './messenger.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MessengerController],
  providers: [MessengerService],
  exports: [MessengerService],
})
export class MessengerModule {}
