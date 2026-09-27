import { Module } from '@nestjs/common';
import { SessionStorageService } from './session-storage.service';
import { BaileysService } from './baileys.service';
import { WhatsAppController } from './whatsapp.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WhatsAppController],
  providers: [SessionStorageService, BaileysService],
  exports: [BaileysService, SessionStorageService],
})
export class WhatsAppModule {}
