import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AlertaService } from './alerta.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse, AlertaItem } from '@japonparts/shared';

@Controller('alerta')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AlertaController {
  constructor(private readonly alertaService: AlertaService) {}

  @Get()
  async getAlertas(): Promise<ApiResponse<AlertaItem[]>> {
    const data = await this.alertaService.obtenerAlertas();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('enviar-stock-email')
  @Roles(UserRole.ADMIN)
  async enviarAlertaStockEmail(
    @Body('email') email?: string,
  ): Promise<ApiResponse<{ enviado: boolean; destinatario: string; skus_alertados: number }>> {
    const data = await this.alertaService.enviarAlertaStockEmail(email);
    return {
      success: true,
      data,
      message: data.enviado
        ? `Notificación de stock crítico enviada a ${data.destinatario}`
        : 'No hay repuestos con stock crítico para notificar',
      timestamp: new Date().toISOString(),
    };
  }
}
