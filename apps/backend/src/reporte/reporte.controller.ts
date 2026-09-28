import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { ReporteService } from './reporte.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse, DashboardKpis, SistemaHealthSummary } from '@japonparts/shared';

@Controller('reporte')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ReporteController {
  constructor(private readonly reporteService: ReporteService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async getDashboardKpis(): Promise<ApiResponse<DashboardKpis>> {
    const data = await this.reporteService.obtenerDashboardKpis();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ventas-canal')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async getVentasPorCanal() {
    const data = await this.reporteService.obtenerVentasPorCanal();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('vendedores')
  @Roles(UserRole.ADMIN)
  async getVentasPorVendedor() {
    const data = await this.reporteService.obtenerVentasPorVendedor();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('top-skus')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async getTopSkus(@Query('limit') limit?: number) {
    const data = await this.reporteService.obtenerTopSkus(limit ? Number(limit) : 20);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sistema')
  @Roles(UserRole.ADMIN)
  async getEstadoSistema(): Promise<ApiResponse<SistemaHealthSummary>> {
    const data = await this.reporteService.obtenerEstadoSistema();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('exportar/excel')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async exportarExcel(
    @Query('tipo') tipo: 'ventas' | 'skus' | 'vendedores' | 'inventario',
    @Res() res: Response,
  ) {
    const safeTipo = ['ventas', 'skus', 'vendedores', 'inventario'].includes(tipo)
      ? tipo
      : 'ventas';
    const buffer = await this.reporteService.exportarExcel(safeTipo);
    const filename = `reporte_${safeTipo}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('exportar/csv')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async exportarCsv(
    @Query('tipo') tipo: 'ventas' | 'skus' | 'vendedores' | 'inventario',
    @Res() res: Response,
  ) {
    const safeTipo = ['ventas', 'skus', 'vendedores', 'inventario'].includes(tipo)
      ? tipo
      : 'ventas';
    const csv = await this.reporteService.exportarCsv(safeTipo);
    const filename = `reporte_${safeTipo}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
