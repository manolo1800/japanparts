import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import {
  UserRole,
  OrderStatus,
  Channel,
  DocumentType,
  ApiResponse,
  OrdenSummary,
  DocumentoVentaSummary,
} from '@japonparts/shared';
import { Usuario } from '../entities/usuario.entity';
import { OrdenService } from './orden.service';
import {
  CreateOrdenDto,
  ConfirmarPagoDto,
  CancelarOrdenDto,
  GenerarDocumentoDto,
} from './dto/orden.dto';

@Controller('orden')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class OrdenController {
  constructor(private readonly ordenService: OrdenService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async create(
    @Body() dto: CreateOrdenDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<OrdenSummary>> {
    const orden = await this.ordenService.create(dto, user?.id);
    return {
      success: true,
      data: orden as any,
      message: `Orden ${orden.numero_orden} creada exitosamente`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async findAll(
    @Query('estado') estado?: OrderStatus,
    @Query('canal') canal?: Channel,
    @Query('search') search?: string,
    @Query('cliente_id') clienteId?: string,
  ): Promise<ApiResponse<OrdenSummary[]>> {
    const ordenes = await this.ordenService.findAll({
      estado,
      canal,
      search,
      cliente_id: clienteId,
    });
    return {
      success: true,
      data: ordenes as any,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async findOne(@Param('id') id: string): Promise<ApiResponse<OrdenSummary>> {
    const orden = await this.ordenService.findOne(id);
    return {
      success: true,
      data: orden as any,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async getPdf(
    @Param('id') id: string,
    @Query('tipo') tipo: DocumentType = DocumentType.FACTURA,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.ordenService.getPdfBuffer(id, tipo);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/confirmar-pago')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async confirmarPago(
    @Param('id') id: string,
    @Body() dto: ConfirmarPagoDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<OrdenSummary>> {
    const orden = await this.ordenService.confirmarPago(id, dto, user?.id);
    return {
      success: true,
      data: orden as any,
      message: `Pago de la orden ${orden.numero_orden} confirmado exitosamente`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/despachar')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async despachar(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<OrdenSummary>> {
    const orden = await this.ordenService.despachar(id, user?.id);
    return {
      success: true,
      data: orden as any,
      message: `Orden ${orden.numero_orden} marcada como despachada`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/cancelar')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarOrdenDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<OrdenSummary>> {
    const orden = await this.ordenService.cancelar(id, dto, user?.id);
    return {
      success: true,
      data: orden as any,
      message: `Orden ${orden.numero_orden} cancelada y stock restaurado exitosamente`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/documento')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async generarDocumento(
    @Param('id') id: string,
    @Body() dto: GenerarDocumentoDto,
  ): Promise<ApiResponse<DocumentoVentaSummary>> {
    const doc = await this.ordenService.generarDocumento(id, dto);
    return {
      success: true,
      data: doc as any,
      message: `Documento ${doc.numero} (${doc.tipo}) generado exitosamente`,
      timestamp: new Date().toISOString(),
    };
  }
}
