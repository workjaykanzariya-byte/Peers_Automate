import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { TaxonomyService } from './taxonomy.service';
import { ContactImportsService } from './contact-imports.service';
import { LeadsService } from '../leads/leads.service';
import { ContactsController, LeadsController } from './contacts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ContactsController, LeadsController],
  providers: [ContactsService, TaxonomyService, ContactImportsService, LeadsService],
  exports: [ContactsService, TaxonomyService, ContactImportsService, LeadsService],
})
export class ContactsModule {}
