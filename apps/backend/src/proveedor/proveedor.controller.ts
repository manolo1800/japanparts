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
import { ProveedorService } from './proveedor.service';
import { CreateProveedorDto, UpdateProveedorDto } from './dto/proveedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse, EstadoCuentaProveedor } from '@japonparts/shared';
import { Proveedor } from '../entities/proveedor.entity';

@Controller('proveedor')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async create(@Body() dto: CreateProveedorDto): Promise<ApiResponse<Proveedor>> {
    const proveedor = await this.proveedorService.create(dto);
    return {
      success: true,
      data: proveedor,
      message: 'Proveedor registrado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async findAll(@Query('q') q?: string): Promise<ApiResponse<Proveedor[]>> {
    const list = await this.proveedorService.findAll(q);
    return {
      success: true,
      data: list,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Proveedor>> {
    const proveedor = await this.proveedorService.findOne(id);
    return {
      success: true,
      data: proveedor,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProveedorDto,
  ): Promise<ApiResponse<Proveedor>> {
    const proveedor = await this.proveedorService.update(id, dto);
    return {
      success: true,
      data: proveedor,
      message: 'Proveedor actualizado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.proveedorService.remove(id);
    return {
      success: true,
      data: null,
      message: 'Proveedor eliminado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/estado-cuenta')
  async getEstadoCuenta(
    @Param('id') id: string,
  ): Promise<ApiResponse<EstadoCuentaProveedor>> {
    const estadoCuenta = await this.proveedorService.getEstadoCuenta(id);
    return {
      success: true,
      data: estadoCuenta,
      timestamp: new Date().toISOString(),
    };
  }
}
