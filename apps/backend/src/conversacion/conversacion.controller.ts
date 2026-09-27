import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConversacionService } from './conversacion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  UserRole,
  ConversationStatus,
  EnviarMensajeWhatsappDto,
  CambiarEstadoConversacionDto,
} from '@japonparts/shared';

@Controller('conversacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversacionController {
  constructor(private readonly conversacionService: ConversacionService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async listar(
    @Query('estado') estado?: ConversationStatus,
    @Query('search') search?: string,
  ) {
    const data = await this.conversacionService.listarConversaciones({
      estado,
      search,
    });
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('webhook-test')
  @Roles(UserRole.ADMIN)
  async simularMensajeEntrante(
    @Body() body: { telefono?: string; texto?: string },
  ) {
    const telefono = body.telefono || '584121234567';
    const texto = body.texto || 'Hola, buenas tardes, busco pastillas de freno';
    await this.conversacionService.handleIncomingWhatsappMessage({
      id: `sim-${Date.now()}`,
      jid: `${telefono}@s.whatsapp.net`,
      telefono,
      texto,
      timestamp: new Date(),
    });
    return {
      success: true,
      message: `Mensaje simulado procesado para ${telefono}`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async obtener(@Param('id') id: string) {
    const data = await this.conversacionService.obtenerConversacion(id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/mensaje')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async enviarMensaje(
    @Param('id') id: string,
    @Body() body: { contenido: string },
    @Request() req: any,
  ) {
    const usuarioId = req.user?.id;
    const data = await this.conversacionService.enviarMensajeManual(
      id,
      body.contenido,
      usuarioId,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/estado')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async cambiarEstado(
    @Param('id') id: string,
    @Body() body: CambiarEstadoConversacionDto,
  ) {
    const data = await this.conversacionService.cambiarEstado(id, body.estado);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}


