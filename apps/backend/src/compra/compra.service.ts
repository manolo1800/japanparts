import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Compra } from '../entities/compra.entity';
import { CompraDetalle } from '../entities/compra-detalle.entity';
import { PagoCompra } from '../entities/pago-compra.entity';
import { Sku } from '../entities/sku.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { CreateCompraDto, CreatePagoCompraDto } from './dto/compra.dto';
import {
  PurchaseStatus,
  MovementType,
  PurchasePaymentCondition,
} from '@japonparts/shared';

@Injectable()
export class CompraService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    @InjectRepository(CompraDetalle)
    private detalleRepository: Repository<CompraDetalle>,
    @InjectRepository(PagoCompra)
    private pagoRepository: Repository<PagoCompra>,
    @InjectRepository(Proveedor)
    private proveedorRepository: Repository<Proveedor>,
  ) {}

  async create(dto: CreateCompraDto, usuarioId?: string): Promise<Compra> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedor_id },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID '${dto.proveedor_id}' no encontrado`);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La compra debe contener al menos un item de detalle');
    }

    return await this.dataSource.transaction(async (manager) => {
      const compraRepo = manager.getRepository(Compra);
      const detalleRepo = manager.getRepository(CompraDetalle);
      const pagoRepo = manager.getRepository(PagoCompra);

      const calculatedSubtotal = dto.items.reduce(
        (acc, item) => acc + item.cantidad * item.costo_unitario,
        0,
      );

      const compra = compraRepo.create({
        proveedor_id: dto.proveedor_id,
        numero_factura: dto.numero_factura.trim().toUpperCase(),
        fecha: new Date(dto.fecha),
        subtotal: dto.subtotal !== undefined ? Number(dto.subtotal) : Number(calculatedSubtotal.toFixed(2)),
        total: Number(dto.total),
        condicion_pago: dto.condicion_pago,
        dias_credito: dto.condicion_pago === PurchasePaymentCondition.CREDITO ? (dto.dias_credito || 30) : 0,
        estado: PurchaseStatus.PENDIENTE,
        archivo_url: dto.archivo_url || null,
        usuario_id: usuarioId || null,
      });

      const guardada = await compraRepo.save(compra);

      for (const item of dto.items) {
        const itemSubtotal = item.subtotal !== undefined
          ? Number(item.subtotal)
          : Number((item.cantidad * item.costo_unitario).toFixed(2));

        const detalle = detalleRepo.create({
          compra_id: guardada.id,
          sku_id: item.sku_id,
          cantidad: item.cantidad,
          costo_unitario: Number(item.costo_unitario),
          subtotal: itemSubtotal,
        });
        await detalleRepo.save(detalle);
      }

      // Si la compra es de contado, registrar pago automático completo
      if (dto.condicion_pago === PurchasePaymentCondition.CONTADO) {
        const pago = pagoRepo.create({
          compra_id: guardada.id,
          fecha: new Date(),
          monto: Number(dto.total),
          metodo: 'contado_efectivo',
          referencia: `Pago automático factura ${guardada.numero_factura}`,
          usuario_id: usuarioId || null,
          notas: 'Cancelación inmediata en compra de contado',
        });
        await pagoRepo.save(pago);
      }

      return await this.findOne(guardada.id, manager.getRepository(Compra));
    });
  }

  async findAll(estado?: PurchaseStatus, proveedorId?: string): Promise<Compra[]> {
    const qb = this.compraRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.proveedor', 'proveedor')
      .leftJoinAndSelect('c.detalles', 'detalles')
      .leftJoinAndSelect('detalles.sku', 'sku')
      .leftJoinAndSelect('c.pagos', 'pagos')
      .orderBy('c.created_at', 'DESC');

    if (estado) {
      qb.andWhere('c.estado = :estado', { estado });
    }

    if (proveedorId) {
      qb.andWhere('c.proveedor_id = :proveedorId', { proveedorId });
    }

    const compras = await qb.getMany();

    // Calcular montos acumulados y saldos
    return compras.map((compra) => {
      const pagado = (compra.pagos || []).reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
      (compra as any).monto_pagado = Number(pagado.toFixed(2));
      (compra as any).saldo_pendiente = Number(Math.max(0, Number(compra.total) - pagado).toFixed(2));
      return compra;
    });
  }

  async findOne(id: string, repo = this.compraRepository): Promise<Compra> {
    const compra = await repo.findOne({
      where: { id },
      relations: ['proveedor', 'detalles', 'detalles.sku', 'pagos', 'pagos.usuario', 'usuario'],
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID '${id}' no encontrada`);
    }

    const pagado = (compra.pagos || []).reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    (compra as any).monto_pagado = Number(pagado.toFixed(2));
    (compra as any).saldo_pendiente = Number(Math.max(0, Number(compra.total) - pagado).toFixed(2));

    return compra;
  }

  /**
   * Endpoint POST /compra/:id/aprobar
   * - Aumenta el stock_actual de cada SKU en compra_detalle
   * - Recalcula el costo_promedio ponderado
   * - Genera movimiento_stock de tipo 'entrada' por cada item
   * - Actualiza estado de compra a 'recibida' o 'pagada'
   */
  async aprobar(id: string, usuarioId?: string): Promise<Compra> {
    return await this.dataSource.transaction(async (manager) => {
      const compraRepo = manager.getRepository(Compra);
      const skuRepo = manager.getRepository(Sku);
      const movRepo = manager.getRepository(MovimientoStock);

      const compra = await compraRepo.findOne({
        where: { id },
        relations: ['detalles', 'pagos'],
      });

      if (!compra) {
        throw new NotFoundException(`Compra con ID '${id}' no encontrada`);
      }

      if (compra.estado !== PurchaseStatus.PENDIENTE) {
        throw new BadRequestException(
          `La compra ya fue procesada y se encuentra en estado '${compra.estado}'`,
        );
      }

      for (const detalle of compra.detalles) {
        const sku = await skuRepo.findOne({
          where: { id: detalle.sku_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!sku) {
          throw new NotFoundException(`SKU con ID '${detalle.sku_id}' no encontrado`);
        }

        const stockAnterior = sku.stock_actual || 0;
        const costoAnterior = Number(sku.costo_promedio) || 0;
        const cantCompra = detalle.cantidad;
        const costoCompra = Number(detalle.costo_unitario);

        // Recálculo del costo promedio ponderado
        const nuevoStock = stockAnterior + cantCompra;
        let nuevoCostoPromedio = costoCompra;
        if (nuevoStock > 0) {
          nuevoCostoPromedio =
            (costoAnterior * stockAnterior + costoCompra * cantCompra) / nuevoStock;
        }

        sku.stock_actual = nuevoStock;
        sku.costo_promedio = Number(nuevoCostoPromedio.toFixed(2));
        await skuRepo.save(sku);

        // Registrar movimiento de stock de entrada
        const movimiento = movRepo.create({
          sku_id: sku.id,
          tipo: MovementType.ENTRADA,
          cantidad: cantCompra,
          referencia_tipo: 'compra',
          referencia_id: compra.numero_factura,
          usuario_id: usuarioId || null,
          notas: `Recepción de compra Factura ${compra.numero_factura}. Costo anterior: $${costoAnterior.toFixed(2)}, Nuevo costo: $${sku.costo_promedio.toFixed(2)}`,
        });
        await movRepo.save(movimiento);
      }

      // Evaluar estado final según pagos
      const totalPagado = (compra.pagos || []).reduce(
        (acc, p) => acc + (Number(p.monto) || 0),
        0,
      );

      if (totalPagado >= Number(compra.total)) {
        compra.estado = PurchaseStatus.PAGADA;
      } else {
        compra.estado = PurchaseStatus.RECIBIDA;
      }

      await compraRepo.save(compra);
      return await this.findOne(compra.id, manager.getRepository(Compra));
    });
  }

  /**
   * Endpoint POST /compra/:id/pago
   * Registra abonos o pagos totales de cuentas por pagar
   */
  async registrarPago(
    id: string,
    dto: CreatePagoCompraDto,
    usuarioId?: string,
  ): Promise<{ compra: Compra; pago: PagoCompra }> {
    return await this.dataSource.transaction(async (manager) => {
      const compraRepo = manager.getRepository(Compra);
      const pagoRepo = manager.getRepository(PagoCompra);

      const compra = await compraRepo.findOne({
        where: { id },
        relations: ['pagos'],
      });

      if (!compra) {
        throw new NotFoundException(`Compra con ID '${id}' no encontrada`);
      }

      const pago = pagoRepo.create({
        compra_id: id,
        compra: compra,
        fecha: new Date(),
        monto: Number(dto.monto),
        metodo: dto.metodo,
        referencia: dto.referencia || null,
        usuario_id: usuarioId || null,
        notas: dto.notas || null,
      });

      const pagoGuardado = await pagoRepo.save(pago);

      const pagosActualizados = [...(compra.pagos || []), pagoGuardado];
      const totalPagado = pagosActualizados.reduce(
        (acc, p) => acc + (Number(p.monto) || 0),
        0,
      );

      if (totalPagado >= Number(compra.total)) {
        compra.estado = PurchaseStatus.PAGADA;
        await compraRepo.save(compra);
      }

      const compraActualizada = await this.findOne(id, manager.getRepository(Compra));

      return {
        compra: compraActualizada,
        pago: pagoGuardado,
      };
    });
  }
}
