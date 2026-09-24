import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, ILike } from 'typeorm';
import {
  Channel,
  OrderStatus,
  DeliveryType,
  PaymentStatus,
  DocumentType,
  MovementType,
} from '@japonparts/shared';
import { Orden } from '../entities/orden.entity';
import { OrdenDetalle } from '../entities/orden-detalle.entity';
import { DocumentoVenta } from '../entities/documento-venta.entity';
import { Cliente } from '../entities/cliente.entity';
import { Sku } from '../entities/sku.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import {
  CreateOrdenDto,
  ConfirmarPagoDto,
  CancelarOrdenDto,
  GenerarDocumentoDto,
} from './dto/orden.dto';
import { PdfGeneratorService } from './pdf-generator.service';

@Injectable()
export class OrdenService {
  private readonly logger = new Logger(OrdenService.name);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(Orden)
    private ordenRepository: Repository<Orden>,
    @InjectRepository(OrdenDetalle)
    private detalleRepository: Repository<OrdenDetalle>,
    @InjectRepository(DocumentoVenta)
    private documentoRepository: Repository<DocumentoVenta>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
    private pdfGeneratorService: PdfGeneratorService,
  ) {}

  /**
   * Genera el siguiente número correlativo para la orden
   * Formato: ORD-YYYY-XXXXX (ej: ORD-2026-00001)
   */
  private async getNextNumeroOrden(repo: Repository<Orden>): Promise<string> {
    const year = new Date().getFullYear();
    const count = await repo
      .createQueryBuilder('o')
      .where('o.numero_orden LIKE :prefix', { prefix: `ORD-${year}-%` })
      .getCount();
    const correlativo = String(count + 1).padStart(5, '0');
    return `ORD-${year}-${correlativo}`;
  }

  /**
   * Genera el correlativo para documentos internos
   * Formato: FAC-XXXXXX o REC-XXXXXX (ej: FAC-000001)
   */
  private async getNextNumeroDocumento(
    repo: Repository<DocumentoVenta>,
    tipo: DocumentType,
  ): Promise<string> {
    const prefix = tipo === DocumentType.FACTURA ? 'FAC' : 'REC';
    const count = await repo
      .createQueryBuilder('d')
      .where('d.tipo = :tipo', { tipo })
      .getCount();
    const correlativo = String(count + 1).padStart(6, '0');
    return `${prefix}-${correlativo}`;
  }

  /**
   * Endpoint POST /orden (Mostrador y multicanal)
   * 1. Valida stock de todos los SKUs
   * 2. Descuenta stock_actual
   * 3. Registra movimiento_stock de salida
   * 4. Encola sync ML (placeholder para Fase 4)
   * 5. Opcional: genera documento interno (Factura o Recibo)
   */
  async create(dto: CreateOrdenDto, usuarioId?: string): Promise<Orden> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La orden debe contener al menos un producto');
    }

    return await this.dataSource.transaction(async (manager) => {
      const ordenRepo = manager.getRepository(Orden);
      const detalleRepo = manager.getRepository(OrdenDetalle);
      const skuRepo = manager.getRepository(Sku);
      const movRepo = manager.getRepository(MovimientoStock);
      const clienteRepo = manager.getRepository(Cliente);
      const docRepo = manager.getRepository(DocumentoVenta);

      // 1. Manejo del Cliente (existente o nuevo inline)
      let clienteId = dto.cliente_id || null;
      if (!clienteId && dto.cliente_nuevo && dto.cliente_nuevo.nombre) {
        const nuevoCliente = clienteRepo.create({
          nombre: dto.cliente_nuevo.nombre.trim(),
          telefono: dto.cliente_nuevo.telefono?.trim() || null,
          email: dto.cliente_nuevo.email?.trim().toLowerCase() || null,
          direccion: dto.cliente_nuevo.direccion?.trim() || null,
          notas: dto.cliente_nuevo.notas?.trim() || null,
        });
        const clienteGuardado = await clienteRepo.save(nuevoCliente);
        clienteId = clienteGuardado.id;
      }

      // 2. Validación de Stock para cada SKU con bloqueo pesimista
      const skuMap = new Map<string, Sku>();
      let totalCalculado = 0;

      for (const item of dto.items) {
        const sku = await skuRepo.findOne({
          where: { id: item.sku_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!sku) {
          throw new NotFoundException(`SKU con ID '${item.sku_id}' no encontrado`);
        }

        if (sku.stock_actual < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para repuesto '${sku.sku_interno} - ${sku.nombre}'. ` +
              `Stock actual: ${sku.stock_actual}, cantidad solicitada: ${item.cantidad}`,
          );
        }

        skuMap.set(item.sku_id, sku);
        totalCalculado += Number((item.cantidad * item.precio_unitario).toFixed(2));
      }

      // 3. Crear cabecera de la Orden
      const numeroOrden = await this.getNextNumeroOrden(ordenRepo);
      const canal = dto.canal || Channel.MOSTRADOR;
      const estadoInicial =
        dto.estado_pago === PaymentStatus.CONFIRMADO
          ? OrderStatus.POR_DESPACHAR
          : OrderStatus.PENDIENTE;

      const orden = ordenRepo.create({
        numero_orden: numeroOrden,
        canal,
        cuenta_id: dto.cuenta_id || null,
        vendedor_id: usuarioId || null,
        cliente_id: clienteId,
        fecha: new Date(),
        estado: estadoInicial,
        tipo_entrega: dto.tipo_entrega || DeliveryType.RETIRO,
        direccion_entrega: dto.direccion_entrega?.trim() || null,
        total: Number(totalCalculado.toFixed(2)),
        metodo_pago: dto.metodo_pago || 'efectivo',
        estado_pago: dto.estado_pago || PaymentStatus.PENDIENTE,
        origen: canal === Channel.MOSTRADOR ? 'mostrador' : canal,
      });

      const ordenGuardada = await ordenRepo.save(orden);

      // 4. Crear detalles y actualizar stock + registrar movimientos
      for (const item of dto.items) {
        const sku = skuMap.get(item.sku_id)!;
        const subtotal = Number((item.cantidad * item.precio_unitario).toFixed(2));

        const detalle = detalleRepo.create({
          orden_id: ordenGuardada.id,
          sku_id: item.sku_id,
          publicacion_id: item.publicacion_id || null,
          cantidad: item.cantidad,
          precio_unitario: Number(item.precio_unitario),
          subtotal,
        });
        await detalleRepo.save(detalle);

        // Descontar stock
        sku.stock_actual -= item.cantidad;
        await skuRepo.save(sku);

        // Registrar movimiento de stock de salida
        const mov = movRepo.create({
          sku_id: sku.id,
          tipo: MovementType.SALIDA,
          cantidad: item.cantidad,
          referencia_tipo: 'orden_venta',
          referencia_id: ordenGuardada.numero_orden,
          usuario_id: usuarioId || null,
          notas: `Venta orden ${ordenGuardada.numero_orden} (${ordenGuardada.canal})`,
        });
        await movRepo.save(mov);

        // Hook para encolar sync ML si aplica (preparado para Fase 4)
        this.triggerMlStockSyncIfNeeded(sku.id, sku.stock_actual);
      }

      // 5. Cargar orden completa para generación de PDF si fue solicitada
      const ordenCompleta = await ordenRepo.findOne({
        where: { id: ordenGuardada.id },
        relations: ['detalles', 'detalles.sku', 'cliente', 'vendedor'],
      });

      if (dto.generar_documento && ordenCompleta) {
        const numeroDoc = await this.getNextNumeroDocumento(docRepo, dto.generar_documento);
        const { url } = await this.pdfGeneratorService.generateDocumentoPdf(
          ordenCompleta,
          dto.generar_documento,
          numeroDoc,
        );

        const docVenta = docRepo.create({
          orden_id: ordenCompleta.id,
          tipo: dto.generar_documento,
          numero: numeroDoc,
          fecha: new Date(),
          datos_cliente: ordenCompleta.cliente
            ? {
                nombre: ordenCompleta.cliente.nombre,
                telefono: ordenCompleta.cliente.telefono,
                email: ordenCompleta.cliente.email,
                direccion: ordenCompleta.cliente.direccion,
              }
            : { nombre: 'Cliente Mostrador' },
          pdf_url: url,
        });
        await docRepo.save(docVenta);
      }

      return await this.findOne(ordenGuardada.id, ordenRepo);
    });
  }

  /**
   * Stub de sincronización con MercadoLibre para Fase 4
   */
  private triggerMlStockSyncIfNeeded(skuId: string, nuevoStock: number) {
    this.logger.log(
      `[ML-SYNC-PREP] Evento de stock actualizado para SKU '${skuId}': ${nuevoStock} unidades restantes. (Sync activo en Fase 4)`,
    );
  }

  /**
   * Listar todas las órdenes con filtros opcionales
   */
  async findAll(params: {
    estado?: OrderStatus;
    canal?: Channel;
    search?: string;
    cliente_id?: string;
  }): Promise<Orden[]> {
    const qb = this.ordenRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.cliente', 'cliente')
      .leftJoinAndSelect('o.vendedor', 'vendedor')
      .leftJoinAndSelect('o.detalles', 'detalles')
      .leftJoinAndSelect('detalles.sku', 'sku')
      .leftJoinAndSelect('o.documentos', 'documentos')
      .orderBy('o.fecha', 'DESC');

    if (params.estado) {
      qb.andWhere('o.estado = :estado', { estado: params.estado });
    }

    if (params.canal) {
      qb.andWhere('o.canal = :canal', { canal: params.canal });
    }

    if (params.cliente_id) {
      qb.andWhere('o.cliente_id = :clienteId', { clienteId: params.cliente_id });
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere(
        '(o.numero_orden ILIKE :term OR cliente.nombre ILIKE :term OR cliente.telefono ILIKE :term)',
        { term },
      );
    }

    return await qb.getMany();
  }

  /**
   * Obtener detalle completo de una orden
   */
  async findOne(id: string, repo = this.ordenRepository): Promise<Orden> {
    const orden = await repo.findOne({
      where: { id },
      relations: [
        'cliente',
        'vendedor',
        'cuenta',
        'detalles',
        'detalles.sku',
        'detalles.publicacion',
        'documentos',
      ],
    });

    if (!orden) {
      throw new NotFoundException(`Orden con ID '${id}' no encontrada`);
    }

    return orden;
  }

  /**
   * Endpoint POST /orden/:id/confirmar-pago
   * - Solo acción humana
   * - Confirma el pago y avanza el estado a 'por_despachar' si estaba en 'pendiente'
   */
  async confirmarPago(
    id: string,
    dto: ConfirmarPagoDto,
    usuarioId?: string,
  ): Promise<Orden> {
    const orden = await this.findOne(id);

    if (orden.estado === OrderStatus.CANCELADA) {
      throw new BadRequestException('No se puede confirmar el pago de una orden cancelada');
    }

    orden.estado_pago = PaymentStatus.CONFIRMADO;
    if (dto.metodo_pago) {
      orden.metodo_pago = dto.metodo_pago;
    }

    if (orden.estado === OrderStatus.PENDIENTE) {
      orden.estado = OrderStatus.POR_DESPACHAR;
    }

    await this.ordenRepository.save(orden);

    // Si solicita generar documento al pagar
    if (dto.generar_documento) {
      await this.generarDocumento(id, { tipo: dto.generar_documento });
    }

    this.logger.log(
      `Pago confirmado para orden ${orden.numero_orden} por usuario ${usuarioId || 'sistema'}`,
    );

    return await this.findOne(id);
  }

  /**
   * Endpoint POST /orden/:id/despachar
   * - Marca la orden como despachada
   */
  async despachar(id: string, usuarioId?: string): Promise<Orden> {
    const orden = await this.findOne(id);

    if (orden.estado === OrderStatus.CANCELADA) {
      throw new BadRequestException('No se puede despachar una orden cancelada');
    }

    if (orden.estado === OrderStatus.DESPACHADA || orden.estado === OrderStatus.CERRADA) {
      throw new BadRequestException(`La orden ya se encuentra en estado '${orden.estado}'`);
    }

    orden.estado = OrderStatus.DESPACHADA;
    await this.ordenRepository.save(orden);

    this.logger.log(
      `Orden ${orden.numero_orden} marcada como DESPACHADA por usuario ${usuarioId || 'sistema'}`,
    );

    return await this.findOne(id);
  }

  /**
   * Endpoint POST /orden/:id/cancelar
   * - Revierte el stock descontado sumándolo nuevamente al stock_actual
   * - Registra movimiento_stock de tipo 'entrada' por cancelación
   * - Pasa el estado a 'cancelada'
   */
  async cancelar(
    id: string,
    dto: CancelarOrdenDto,
    usuarioId?: string,
  ): Promise<Orden> {
    return await this.dataSource.transaction(async (manager) => {
      const ordenRepo = manager.getRepository(Orden);
      const skuRepo = manager.getRepository(Sku);
      const movRepo = manager.getRepository(MovimientoStock);

      const orden = await ordenRepo.findOne({
        where: { id },
        relations: ['detalles', 'detalles.sku'],
      });

      if (!orden) {
        throw new NotFoundException(`Orden con ID '${id}' no encontrada`);
      }

      if (orden.estado === OrderStatus.CANCELADA) {
        throw new BadRequestException('La orden ya ha sido cancelada previamente');
      }

      // Revertir el stock de cada detalle
      for (const detalle of orden.detalles) {
        const sku = await skuRepo.findOne({
          where: { id: detalle.sku_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (sku) {
          sku.stock_actual += detalle.cantidad;
          await skuRepo.save(sku);

          // Generar movimiento de entrada por reposición
          const mov = movRepo.create({
            sku_id: sku.id,
            tipo: MovementType.ENTRADA,
            cantidad: detalle.cantidad,
            referencia_tipo: 'cancelacion_orden',
            referencia_id: orden.numero_orden,
            usuario_id: usuarioId || null,
            notas: `Reversión por cancelación de orden: ${dto.motivo || 'Sin motivo especificado'}`,
          });
          await movRepo.save(mov);

          // Trigger sync ML para reponer stock
          this.triggerMlStockSyncIfNeeded(sku.id, sku.stock_actual);
        }
      }

      orden.estado = OrderStatus.CANCELADA;
      await ordenRepo.save(orden);

      this.logger.log(
        `Orden ${orden.numero_orden} CANCELADA y stock restaurado exitosamente`,
      );

      return await this.findOne(id, ordenRepo);
    });
  }

  /**
   * Generar documento interno (factura o recibo) para una orden
   */
  async generarDocumento(
    id: string,
    dto: GenerarDocumentoDto,
  ): Promise<DocumentoVenta> {
    const orden = await this.findOne(id);
    const numeroDoc = await this.getNextNumeroDocumento(
      this.documentoRepository,
      dto.tipo,
    );

    const { url } = await this.pdfGeneratorService.generateDocumentoPdf(
      orden,
      dto.tipo,
      numeroDoc,
    );

    const docVenta = this.documentoRepository.create({
      orden_id: orden.id,
      tipo: dto.tipo,
      numero: numeroDoc,
      fecha: new Date(),
      datos_cliente: orden.cliente
        ? {
            nombre: orden.cliente.nombre,
            telefono: orden.cliente.telefono,
            email: orden.cliente.email,
            direccion: orden.cliente.direccion,
          }
        : { nombre: 'Cliente Mostrador' },
      pdf_url: url,
    });

    return await this.documentoRepository.save(docVenta);
  }

  /**
   * Endpoint GET /orden/:id/pdf?tipo=factura|recibo
   * - Retorna el buffer del PDF generado
   */
  async getPdfBuffer(
    id: string,
    tipo: DocumentType = DocumentType.FACTURA,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const orden = await this.findOne(id);

    // Buscar si ya existe un documento generado para este tipo
    const docExistente = orden.documentos?.find((d) => d.tipo === tipo);
    const numero = docExistente
      ? docExistente.numero
      : await this.getNextNumeroDocumento(this.documentoRepository, tipo);

    const { buffer, filename } =
      await this.pdfGeneratorService.generateDocumentoPdf(orden, tipo, numero);

    return { buffer, filename };
  }
}
