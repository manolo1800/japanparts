import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MovimientoStockService } from './movimiento-stock.service';
import { AjusteStockDto } from './dto/ajuste-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse } from '@japonparts/shared';
import { Usuario } from '../entities/usuario.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { Sku } from '../entities/sku.entity';

@Controller('sku/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class MovimientoStockController {
  constructor(private readonly movimientoService: MovimientoStockService) {}

  @Post('ajuste-stock')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async ajustarStock(
    @Param('id') skuId: string,
    @Body() dto: AjusteStockDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<{ sku: Sku; movimiento: MovimientoStock }>> {
    const result = await this.movimientoService.ajustarStock(skuId, dto, user.id);
    return {
      success: true,
      data: result,
      message: 'Ajuste de stock registrado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('movimientos')
  async findBySku(
    @Param('id') skuId: string,
  ): Promise<ApiResponse<MovimientoStock[]>> {
    const movimientos = await this.movimientoService.findBySku(skuId);
    return {
      success: true,
      data: movimientos,
      timestamp: new Date().toISOString(),
    };
  }
}
