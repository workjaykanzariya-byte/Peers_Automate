import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MetaModule } from '../meta/meta.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, MetaModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
