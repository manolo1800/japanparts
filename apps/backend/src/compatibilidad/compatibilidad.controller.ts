import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CompatibilidadService } from './compatibilidad.service';
import {
  CreateCompatibilidadDto,
  UpdateCompatibilidadDto,
  BuscarCompatibilidadDto,
} from './dto/compatibilidad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse } from '@japonparts/shared';
import { Compatibilidad } from '../entities/compatibilidad.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class CompatibilidadController {
  constructor(private readonly compatibilidadService: CompatibilidadService) {}

  @Post('sku/:id/compatibilidad')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async create(
    @Param('id') skuId: string,
    @Body() dto: CreateCompatibilidadDto,
  ): Promise<ApiResponse<Compatibilidad>> {
    const item = await this.compatibilidadService.create(skuId, dto);
    return {
      success: true,
      data: item,
      message: 'Compatibilidad registrada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sku/:id/compatibilidad')
  async findBySku(@Param('id') skuId: string): Promise<ApiResponse<Compatibilidad[]>> {
    const items = await this.compatibilidadService.findBySku(skuId);
    return {
      success: true,
      data: items,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('sku/:id/compatibilidad/:compId')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async update(
    @Param('compId') compId: string,
    @Body() dto: UpdateCompatibilidadDto,
  ): Promise<ApiResponse<Compatibilidad>> {
    const item = await this.compatibilidadService.update(compId, dto);
    return {
      success: true,
      data: item,
      message: 'Compatibilidad actualizada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('sku/:id/compatibilidad/:compId')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async remove(@Param('compId') compId: string): Promise<ApiResponse<null>> {
    await this.compatibilidadService.remove(compId);
    return {
      success: true,
      data: null,
      message: 'Compatibilidad eliminada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint de búsqueda inversa de compatibilidad
   * GET /compatibilidad/buscar?marca_vehiculo=Toyota&modelo=Corolla&anio=1995&motor=1.8
   */
  @Get('compatibilidad/buscar')
  async buscarInversa(
    @Query() query: BuscarCompatibilidadDto,
  ): Promise<ApiResponse<Compatibilidad[]>> {
    const items = await this.compatibilidadService.buscarCompatibilidad(query);
    return {
      success: true,
      data: items,
      timestamp: new Date().toISOString(),
    };
  }
}
