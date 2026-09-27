import { Module } from '@nestjs/common';
import { DeepSeekModule } from './deepseek/deepseek.module';
import { MailModule } from './mail/mail.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [DeepSeekModule, MailModule, WhatsAppModule],
  exports: [DeepSeekModule, MailModule, WhatsAppModule],
})
export class IntegrationsModule {}
