import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdenCompraService } from './orden-compra.service';
import {
  CreateOrdenCompraDto,
  EnviarOrdenCompraEmailDto,
  EnviarOrdenCompraWhatsappDto,
} from './dto/orden-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import {
  UserRole,
  ApiResponse,
  PurchaseOrderStatus,
} from '@japonparts/shared';
import { OrdenCompra } from '../entities/orden-compra.entity';
import { Usuario } from '../entities/usuario.entity';
import { Compra } from '../entities/compra.entity';

@Controller('orden-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class OrdenCompraController {
  constructor(private readonly ordenCompraService: OrdenCompraService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BODEGA, UserRole.VENDEDOR)
  async create(
    @Body() dto: CreateOrdenCompraDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<OrdenCompra>> {
    const orden = await this.ordenCompraService.create(dto, user?.id);
    return {
      success: true,
      data: orden,
      message: `Orden de compra ${orden.numero_orden} creada exitosamente`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async findAll(
    @Query('estado') estado?: PurchaseOrderStatus,
    @Query('proveedor_id') proveedorId?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<OrdenCompra[]>> {
    const ordenes = await this.ordenCompraService.findAll({
      estado,
      proveedor_id: proveedorId,
      search,
    });
    return {
      success: true,
      data: ordenes,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<OrdenCompra>> {
    const orden = await this.ordenCompraService.findOne(id);
    return {
      success: true,
      data: orden,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.ordenCompraService.getPdfBuffer(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/enviar-email')
  @Roles(UserRole.ADMIN, UserRole.BODEGA, UserRole.VENDEDOR)
  async enviarEmail(
    @Param('id') id: string,
    @Body() dto: EnviarOrdenCompraEmailDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.ordenCompraService.enviarEmail(id, dto);
    return {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/enviar-whatsapp')
  @Roles(UserRole.ADMIN, UserRole.BODEGA, UserRole.VENDEDOR)
  async enviarWhatsapp(
    @Param('id') id: string,
    @Body() dto: EnviarOrdenCompraWhatsappDto,
  ): Promise<
    ApiResponse<{
      directSent: boolean;
      message: string;
      waLink: string;
    }>
  > {
    const result = await this.ordenCompraService.enviarWhatsapp(id, dto);
    return {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/convertir-a-factura')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async convertirAFactura(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<Compra>> {
    const compra = await this.ordenCompraService.convertirAFactura(id, user?.id);
    return {
      success: true,
      data: compra,
      message: `Orden de compra convertida a Factura de Compra #${compra.numero_factura}`,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/estado')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async updateEstado(
    @Param('id') id: string,
    @Body('estado') estado: PurchaseOrderStatus,
  ): Promise<ApiResponse<OrdenCompra>> {
    const orden = await this.ordenCompraService.updateEstado(id, estado);
    return {
      success: true,
      data: orden,
      message: `Estado actualizado a ${estado}`,
      timestamp: new Date().toISOString(),
    };
  }
}
