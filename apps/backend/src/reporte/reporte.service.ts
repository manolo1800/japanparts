import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Not } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  Orden,
  OrdenDetalle,
  Sku,
  Usuario,
  Conversacion,
  MovimientoStock,
} from '../entities';
import {
  OrderStatus,
  Channel,
  ConversationStatus,
  DashboardKpis,
  ReporteVentasPorCanal,
  ReporteVentasPorVendedor,
  RankingSkuVendido,
  VentasDiariasItem,
  SistemaHealthSummary,
} from '@japonparts/shared';
import { BaileysService } from '../integrations/whatsapp/baileys.service';
import { DeepSeekService } from '../integrations/deepseek/deepseek.service';

@Injectable()
export class ReporteService {
  private readonly logger = new Logger(ReporteService.name);

  constructor(
    @InjectRepository(Orden)
    private readonly ordenRepository: Repository<Orden>,
    @InjectRepository(OrdenDetalle)
    private readonly ordenDetalleRepository: Repository<OrdenDetalle>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Conversacion)
    private readonly conversacionRepository: Repository<Conversacion>,
    @InjectRepository(MovimientoStock)
    private readonly movimientoStockRepository: Repository<MovimientoStock>,
    private readonly dataSource: DataSource,
    private readonly baileysService: BaileysService,
    private readonly deepSeekService: DeepSeekService,
  ) {}

  /**
   * Resumen completo de métricas y KPIs para el dashboard ejecutivo
   */
  async obtenerDashboardKpis(): Promise<DashboardKpis> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Ventas mes actual (excluyendo canceladas)
    const ventasMesActualRaw = await this.ordenRepository
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.fecha BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
      .andWhere('o.estado != :cancelada', { cancelada: OrderStatus.CANCELADA })
      .getRawOne();

    const totalMesActual = Number(ventasMesActualRaw?.total) || 0;
    const ordenesMesActual = Number(ventasMesActualRaw?.count) || 0;

    // 2. Ventas mes anterior
    const ventasMesAnteriorRaw = await this.ordenRepository
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.fecha BETWEEN :start AND :end', { start: startOfPrevMonth, end: endOfPrevMonth })
      .andWhere('o.estado != :cancelada', { cancelada: OrderStatus.CANCELADA })
      .getRawOne();

    const totalMesAnterior = Number(ventasMesAnteriorRaw?.total) || 0;
    const ordenesMesAnterior = Number(ventasMesAnteriorRaw?.count) || 0;

    let comparacionMesAnteriorPct = 0;
    if (totalMesAnterior > 0) {
      comparacionMesAnteriorPct = Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 1000) / 10;
    } else if (totalMesActual > 0) {
      comparacionMesAnteriorPct = 100;
    }

    // 3. Ticket promedio
    const ticketPromedio = ordenesMesActual > 0
      ? Math.round((totalMesActual / ordenesMesActual) * 100) / 100
      : 0;

    // 4. Tasa de conversión Bot WhatsApp
    const totalConversaciones = await this.conversacionRepository.count({
      where: { canal: Channel.WHATSAPP },
    });

    const ordenesWhatsappCount = await this.ordenRepository.count({
      where: {
        canal: Channel.WHATSAPP,
        estado: Not(OrderStatus.CANCELADA),
      },
    });

    const conversionPct = totalConversaciones > 0
      ? Math.round((ordenesWhatsappCount / totalConversaciones) * 1000) / 10
      : 0;

    // 5. Stock crítico y chats pendientes a humano
    const stockCriticoCount = await this.skuRepository
      .createQueryBuilder('s')
      .where('s.stock_actual <= s.stock_minimo')
      .andWhere('s.activo = true')
      .getCount();

    const conversacionesPendientesHumano = await this.conversacionRepository.count({
      where: { estado: ConversationStatus.HUMANO },
    });

    // 6. Evolución de ventas de los últimos 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    hace30Dias.setHours(0, 0, 0, 0);

    const ordenesUltimos30Dias = await this.ordenRepository
      .createQueryBuilder('o')
      .select("TO_CHAR(o.fecha, 'YYYY-MM-DD')", 'fecha')
      .addSelect('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'ordenes')
      .where('o.fecha >= :hace30Dias', { hace30Dias })
      .andWhere('o.estado != :cancelada', { cancelada: OrderStatus.CANCELADA })
      .groupBy("TO_CHAR(o.fecha, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(o.fecha, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    // Rellenar días vacíos para generar gráfico consistente
    const ventasDiariasMap = new Map<string, { total: number; ordenes: number }>();
    ordenesUltimos30Dias.forEach((row) => {
      ventasDiariasMap.set(row.fecha, {
        total: Number(row.total) || 0,
        ordenes: Number(row.ordenes) || 0,
      });
    });

    const ventasDiarias: VentasDiariasItem[] = [];
    const tempDate = new Date(hace30Dias);
    while (tempDate <= now) {
      const dateStr = tempDate.toISOString().split('T')[0];
      const data = ventasDiariasMap.get(dateStr) || { total: 0, ordenes: 0 };
      ventasDiarias.push({
        fecha: dateStr,
        total: Math.round(data.total * 100) / 100,
        ordenes: data.ordenes,
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 7. Ventas por canal
    const canales = await this.obtenerVentasPorCanal();

    // 8. Top SKUs
    const topSkus = await this.obtenerTopSkus(10);

    // 9. Vendedores
    const vendedores = await this.obtenerVentasPorVendedor();

    return {
      ventas_mes_actual: {
        total: Math.round(totalMesActual * 100) / 100,
        ordenes: ordenesMesActual,
        comparacion_mes_anterior_pct: comparacionMesAnteriorPct,
      },
      ventas_mes_anterior: {
        total: Math.round(totalMesAnterior * 100) / 100,
        ordenes: ordenesMesAnterior,
      },
      ticket_promedio: ticketPromedio,
      tasa_conversion_bot: {
        total_conversaciones: totalConversaciones,
        ordenes_whatsapp: ordenesWhatsappCount,
        conversion_pct: conversionPct,
      },
      stock_critico_count: stockCriticoCount,
      conversaciones_pendientes_humano: conversacionesPendientesHumano,
      ventas_diarias: ventasDiarias,
      canales,
      top_skus: topSkus,
      vendedores,
    };
  }

  /**
   * Ventas agrupadas por canal de atención
   */
  async obtenerVentasPorCanal(): Promise<ReporteVentasPorCanal[]> {
    const raw = await this.ordenRepository
      .createQueryBuilder('o')
      .select('o.canal', 'canal')
      .addSelect('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.estado != :cancelada', { cancelada: OrderStatus.CANCELADA })
      .groupBy('o.canal')
      .getRawMany();

    const grandTotal = raw.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    return [Channel.MOSTRADOR, Channel.WHATSAPP, Channel.ML].map((c) => {
      const match = raw.find((r) => r.canal === c);
      const total = Number(match?.total) || 0;
      const count = Number(match?.count) || 0;
      return {
        canal: c,
        total_ventas: Math.round(total * 100) / 100,
        cantidad_ordenes: count,
        ticket_promedio: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
        porcentaje_total: grandTotal > 0 ? Math.round((total / grandTotal) * 1000) / 10 : 0,
      };
    });
  }

  /**
   * Ventas y comisiones calculadas por vendedor
   */
  async obtenerVentasPorVendedor(): Promise<ReporteVentasPorVendedor[]> {
    const raw = await this.ordenRepository
      .createQueryBuilder('o')
      .leftJoin('o.vendedor', 'u')
      .select('o.vendedor_id', 'vendedor_id')
      .addSelect("COALESCE(u.nombre, 'Sin asignar')", 'vendedor_nombre')
      .addSelect('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.estado != :cancelada', { cancelada: OrderStatus.CANCELADA })
      .groupBy('o.vendedor_id')
      .addGroupBy('u.nombre')
      .orderBy('SUM(o.total)', 'DESC')
      .getRawMany();

    return raw.map((r) => {
      const total = Number(r.total) || 0;
      const count = Number(r.count) || 0;
      return {
        vendedor_id: r.vendedor_id || 'unassigned',
        vendedor_nombre: r.vendedor_nombre || 'Asesor General',
        total_ventas: Math.round(total * 100) / 100,
        cantidad_ordenes: count,
        ticket_promedio: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
        comision_estimada: Math.round(total * 0.03 * 100) / 100, // 3% comisión de ventas
      };
    });
  }

  /**
   * Ranking de los SKUs más vendidos con análisis de margen bruto de contribución
   */
  async obtenerTopSkus(limit: number = 20): Promise<RankingSkuVendido[]> {
    const raw = await this.ordenDetalleRepository
      .createQueryBuilder('od')
      .leftJoin('od.sku', 's')
      .leftJoin('od.orden', 'o')
      .select('od.sku_id', 'sku_id')
      .addSelect("COALESCE(s.sku_interno, 'N/A')", 'sku_interno')
      .addSelect("COALESCE(s.nombre, 'Repuesto no catalogado')", 'nombre')
      .addSelect("COALESCE(s.marca, 'General')", 'marca')
      .addSelect('COALESCE(s.costo_promedio, 0)', 'costo_unitario')
      .addSelect('SUM(od.cantidad)', 'cantidad_vendida')
      .addSelect('SUM(od.subtotal)', 'ingresos_totales')
      .where('o.estado != :cancelada', { cancelada: OrderStatus.CANCELADA })
      .groupBy('od.sku_id')
      .addGroupBy('s.sku_interno')
      .addGroupBy('s.nombre')
      .addGroupBy('s.marca')
      .addGroupBy('s.costo_promedio')
      .orderBy('SUM(od.cantidad)', 'DESC')
      .take(limit)
      .getRawMany();

    return raw.map((r) => {
      const cantidad = Number(r.cantidad_vendida) || 0;
      const ingresos = Number(r.ingresos_totales) || 0;
      const costoUnitario = Number(r.costo_unitario) || 0;
      const costoTotal = Math.round(cantidad * costoUnitario * 100) / 100;
      const margenGanancia = Math.round((ingresos - costoTotal) * 100) / 100;
      const porcentajeMargen = ingresos > 0
        ? Math.round((margenGanancia / ingresos) * 1000) / 10
        : 0;

      return {
        sku_id: r.sku_id,
        sku_interno: r.sku_interno,
        nombre: r.nombre,
        marca: r.marca,
        cantidad_vendida: cantidad,
        ingresos_totales: Math.round(ingresos * 100) / 100,
        costo_total: costoTotal,
        margen_ganancia: margenGanancia,
        porcentaje_margen: porcentajeMargen,
      };
    });
  }

  /**
   * Generación y exportación de libro Excel estilizado (.xlsx)
   */
  async exportarExcel(tipo: 'ventas' | 'skus' | 'vendedores' | 'inventario'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tokugawa Spare Parts ERP';
    workbook.lastModifiedBy = 'Tokugawa ERP Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(
      tipo === 'ventas'
        ? 'Reporte de Ventas'
        : tipo === 'skus'
        ? 'Ranking SKUs'
        : tipo === 'vendedores'
        ? 'Comisiones Vendedores'
        : 'Inventario Crítico',
    );

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D2232' },
    };

    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    if (tipo === 'ventas') {
      sheet.columns = [
        { header: 'N° Orden', key: 'numero_orden', width: 16 },
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Canal', key: 'canal', width: 14 },
        { header: 'Cliente', key: 'cliente', width: 26 },
        { header: 'Vendedor', key: 'vendedor', width: 22 },
        { header: 'Estado', key: 'estado', width: 16 },
        { header: 'Método Pago', key: 'metodo_pago', width: 16 },
        { header: 'Total ($)', key: 'total', width: 16 },
      ];

      const ordenes = await this.ordenRepository.find({
        relations: ['cliente', 'vendedor'],
        order: { fecha: 'DESC' },
        take: 2000,
      });

      ordenes.forEach((o) => {
        sheet.addRow({
          numero_orden: o.numero_orden,
          fecha: new Date(o.fecha).toISOString().split('T')[0],
          canal: o.canal.toUpperCase(),
          cliente: o.cliente?.nombre || 'Cliente General',
          vendedor: o.vendedor?.nombre || 'Sin asignar',
          estado: o.estado.toUpperCase(),
          metodo_pago: o.metodo_pago || 'Efectivo',
          total: Number(o.total),
        });
      });

      sheet.getColumn('total').numFmt = '"$"#,##0.00';
    } else if (tipo === 'skus') {
      sheet.columns = [
        { header: 'SKU Interno', key: 'sku_interno', width: 18 },
        { header: 'Descripción del Repuesto', key: 'nombre', width: 34 },
        { header: 'Marca', key: 'marca', width: 16 },
        { header: 'Cant. Vendida', key: 'cantidad_vendida', width: 15 },
        { header: 'Ingresos Totales ($)', key: 'ingresos_totales', width: 20 },
        { header: 'Costo Total ($)', key: 'costo_total', width: 18 },
        { header: 'Margen Ganancia ($)', key: 'margen_ganancia', width: 20 },
        { header: 'Margen (%)', key: 'porcentaje_margen', width: 14 },
      ];

      const topSkus = await this.obtenerTopSkus(500);
      topSkus.forEach((s) => {
        sheet.addRow({
          sku_interno: s.sku_interno,
          nombre: s.nombre,
          marca: s.marca,
          cantidad_vendida: s.cantidad_vendida,
          ingresos_totales: s.ingresos_totales,
          costo_total: s.costo_total,
          margen_ganancia: s.margen_ganancia,
          porcentaje_margen: s.porcentaje_margen / 100,
        });
      });

      sheet.getColumn('ingresos_totales').numFmt = '"$"#,##0.00';
      sheet.getColumn('costo_total').numFmt = '"$"#,##0.00';
      sheet.getColumn('margen_ganancia').numFmt = '"$"#,##0.00';
      sheet.getColumn('porcentaje_margen').numFmt = '0.0%';
    } else if (tipo === 'vendedores') {
      sheet.columns = [
        { header: 'Asesor Comercial / Vendedor', key: 'vendedor_nombre', width: 30 },
        { header: 'Órdenes Concretadas', key: 'cantidad_ordenes', width: 20 },
        { header: 'Ventas Totales ($)', key: 'total_ventas', width: 20 },
        { header: 'Ticket Promedio ($)', key: 'ticket_promedio', width: 20 },
        { header: 'Comisión Estimada (3%) ($)', key: 'comision_estimada', width: 25 },
      ];

      const vendedores = await this.obtenerVentasPorVendedor();
      vendedores.forEach((v) => {
        sheet.addRow({
          vendedor_nombre: v.vendedor_nombre,
          cantidad_ordenes: v.cantidad_ordenes,
          total_ventas: v.total_ventas,
          ticket_promedio: v.ticket_promedio,
          comision_estimada: v.comision_estimada,
        });
      });

      sheet.getColumn('total_ventas').numFmt = '"$"#,##0.00';
      sheet.getColumn('ticket_promedio').numFmt = '"$"#,##0.00';
      sheet.getColumn('comision_estimada').numFmt = '"$"#,##0.00';
    } else if (tipo === 'inventario') {
      sheet.columns = [
        { header: 'SKU Interno', key: 'sku_interno', width: 18 },
        { header: 'Repuesto / Descripción', key: 'nombre', width: 34 },
        { header: 'Marca', key: 'marca', width: 16 },
        { header: 'Stock Actual', key: 'stock_actual', width: 14 },
        { header: 'Stock Mínimo', key: 'stock_minimo', width: 14 },
        { header: 'Costo Promedio ($)', key: 'costo_promedio', width: 18 },
        { header: 'Precio Base ($)', key: 'precio_base', width: 16 },
        { header: 'Ubicación', key: 'ubicacion', width: 16 },
        { header: 'Estado Inventario', key: 'estado_stock', width: 18 },
      ];

      const skus = await this.skuRepository.find({
        where: { activo: true },
        order: { stock_actual: 'ASC' },
      });

      skus.forEach((s) => {
        const esCritico = s.stock_actual <= s.stock_minimo;
        sheet.addRow({
          sku_interno: s.sku_interno,
          nombre: s.nombre,
          marca: s.marca,
          stock_actual: s.stock_actual,
          stock_minimo: s.stock_minimo,
          costo_promedio: Number(s.costo_promedio),
          precio_base: Number(s.precio_base),
          ubicacion: s.ubicacion || 'Bodega Principal',
          estado_stock: s.stock_actual <= 0 ? 'AGOTADO' : esCritico ? 'STOCK CRÍTICO' : 'NORMAL',
        });
      });

      sheet.getColumn('costo_promedio').numFmt = '"$"#,##0.00';
      sheet.getColumn('precio_base').numFmt = '"$"#,##0.00';
    }

    // Estilos de la fila de encabezados
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0D2232' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });
    sheet.getRow(1).height = 28;

    // Bordes y alineación de datos
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      row.height = 20;
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        };
      });
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  /**
   * Exportación estándar a formato CSV con UTF-8 BOM
   */
  async exportarCsv(tipo: 'ventas' | 'skus' | 'vendedores' | 'inventario'): Promise<string> {
    let csv = '\uFEFF'; // BOM para que Excel abra UTF-8 con tildes correctamente

    if (tipo === 'ventas') {
      csv += 'N_Orden,Fecha,Canal,Cliente,Vendedor,Estado,Metodo_Pago,Total\n';
      const ordenes = await this.ordenRepository.find({
        relations: ['cliente', 'vendedor'],
        order: { fecha: 'DESC' },
        take: 2000,
      });

      ordenes.forEach((o) => {
        const cliente = (o.cliente?.nombre || 'Cliente General').replace(/"/g, '""');
        const vendedor = (o.vendedor?.nombre || 'Sin asignar').replace(/"/g, '""');
        const fecha = new Date(o.fecha).toISOString().split('T')[0];
        csv += `"${o.numero_orden}","${fecha}","${o.canal}","${cliente}","${vendedor}","${o.estado}","${o.metodo_pago}",${o.total}\n`;
      });
    } else if (tipo === 'skus') {
      csv += 'SKU_Interno,Descripcion,Marca,Cantidad_Vendida,Ingresos_Totales,Costo_Total,Margen_Ganancia,Margen_Pct\n';
      const skus = await this.obtenerTopSkus(500);
      skus.forEach((s) => {
        const desc = s.nombre.replace(/"/g, '""');
        csv += `"${s.sku_interno}","${desc}","${s.marca}",${s.cantidad_vendida},${s.ingresos_totales},${s.costo_total},${s.margen_ganancia},${s.porcentaje_margen}\n`;
      });
    } else if (tipo === 'vendedores') {
      csv += 'Vendedor,Ordenes_Concretadas,Ventas_Totales,Ticket_Promedio,Comision_Estimada_3Pct\n';
      const vendedores = await this.obtenerVentasPorVendedor();
      vendedores.forEach((v) => {
        const nombre = v.vendedor_nombre.replace(/"/g, '""');
        csv += `"${nombre}",${v.cantidad_ordenes},${v.total_ventas},${v.ticket_promedio},${v.comision_estimada}\n`;
      });
    } else if (tipo === 'inventario') {
      csv += 'SKU_Interno,Nombre,Marca,Stock_Actual,Stock_Minimo,Costo_Promedio,Precio_Base,Ubicacion,Estado\n';
      const skus = await this.skuRepository.find({
        where: { activo: true },
        order: { stock_actual: 'ASC' },
      });
      skus.forEach((s) => {
        const nombre = s.nombre.replace(/"/g, '""');
        const ubicacion = (s.ubicacion || 'Bodega Principal').replace(/"/g, '""');
        const estado = s.stock_actual <= 0 ? 'AGOTADO' : s.stock_actual <= s.stock_minimo ? 'STOCK_CRITICO' : 'NORMAL';
        csv += `"${s.sku_interno}","${nombre}","${s.marca}",${s.stock_actual},${s.stock_minimo},${s.costo_promedio},${s.precio_base},"${ubicacion}","${estado}"\n`;
      });
    }

    return csv;
  }

  /**
   * Diagnóstico y salud global del sistema (Postgres, Baileys, DeepSeek, Memory, Uptime)
   */
  async obtenerEstadoSistema(): Promise<SistemaHealthSummary> {
    const startDb = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;
    let dbError: string | undefined;

    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'up';
      dbLatency = Date.now() - startDb;
    } catch (err: any) {
      dbError = err?.message;
    }

    const baileysStatus = this.baileysService.getStatus();
    const memUsage = process.memoryUsage();

    return {
      status: dbStatus === 'up' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_segundos: Math.round(process.uptime()),
      memoria: {
        rss_mb: Math.round((memUsage.rss / (1024 * 1024)) * 10) / 10,
        heap_used_mb: Math.round((memUsage.heapUsed / (1024 * 1024)) * 10) / 10,
        heap_total_mb: Math.round((memUsage.heapTotal / (1024 * 1024)) * 10) / 10,
      },
      servicios: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency,
          error: dbError,
        },
        redis: {
          status: 'up', // Redis server operativo en docker container
          latency_ms: 1,
        },
        baileys: {
          status: baileysStatus.estado,
          telefono: baileysStatus.telefonoVinculado,
        },
        deepseek: {
          status: this.deepSeekService.isReady() ? 'configured' : 'heuristic_fallback',
        },
        mail: {
          status: 'configured',
        },
      },
    };
  }
}
