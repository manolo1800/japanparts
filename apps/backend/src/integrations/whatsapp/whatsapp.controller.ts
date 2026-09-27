import {
  Controller,
  Get,
  Post,
  Sse,
  MessageEvent,
  UseGuards,
} from '@nestjs/common';
import { BaileysService } from './baileys.service';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@japonparts/shared';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppController {
  constructor(private readonly baileysService: BaileysService) {}

  @Get('status')
  getStatus() {
    return {
      success: true,
      data: this.baileysService.getStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('qr')
  getQr() {
    return {
      success: true,
      data: this.baileysService.getQrCode(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('disconnect')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async disconnect() {
    await this.baileysService.disconnect();
    return {
      success: true,
      message: 'Sesión de WhatsApp desconectada',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reconnect')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async reconnect() {
    await this.baileysService.forceReconnect();
    return {
      success: true,
      message: 'Reconexión iniciada',
      timestamp: new Date().toISOString(),
    };
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.baileysService.getStatusStream().pipe(
      map((status) => ({
        data: status,
      } as MessageEvent)),
    );
  }
}
