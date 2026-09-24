import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from '../entities/proveedor.entity';
import { Compra } from '../entities/compra.entity';
import { PagoCompra } from '../entities/pago-compra.entity';
import { CreateProveedorDto, UpdateProveedorDto } from './dto/proveedor.dto';
import { EstadoCuentaProveedor, PurchaseStatus, ProveedorSummary } from '@japonparts/shared';

@Injectable()
export class ProveedorService {
  constructor(
    @InjectRepository(Proveedor)
    private proveedorRepository: Repository<Proveedor>,
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    @InjectRepository(PagoCompra)
    private pagoRepository: Repository<PagoCompra>,
  ) {}

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    const existing = await this.proveedorRepository.findOne({
      where: { rif: dto.rif.trim().toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un proveedor registrado con el RIF '${dto.rif}'`);
    }

    const proveedor = this.proveedorRepository.create({
      ...dto,
      rif: dto.rif.trim().toUpperCase(),
    });

    return await this.proveedorRepository.save(proveedor);
  }

  async findAll(search?: string): Promise<Proveedor[]> {
    const qb = this.proveedorRepository.createQueryBuilder('p').orderBy('p.nombre', 'ASC');

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      qb.where('(p.nombre ILIKE :term OR p.rif ILIKE :term OR p.contacto ILIKE :term)', { term });
    }

    return await qb.getMany();
  }

  async findOne(id: string): Promise<Proveedor> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id },
      relations: ['compras', 'compras.pagos'],
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID '${id}' no encontrado`);
    }

    return proveedor;
  }

  async findByRif(rif: string): Promise<Proveedor | null> {
    return await this.proveedorRepository.findOne({
      where: { rif: rif.trim().toUpperCase() },
    });
  }

  async update(id: string, dto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);
    if (dto.rif && dto.rif !== proveedor.rif) {
      const existing = await this.findByRif(dto.rif);
      if (existing && existing.id !== id) {
        throw new ConflictException(`El RIF '${dto.rif}' ya pertenece a otro proveedor`);
      }
      dto.rif = dto.rif.trim().toUpperCase();
    }
    Object.assign(proveedor, dto);
    return await this.proveedorRepository.save(proveedor);
  }

  async remove(id: string): Promise<void> {
    const proveedor = await this.findOne(id);
    await this.proveedorRepository.remove(proveedor);
  }

  async getEstadoCuenta(id: string): Promise<EstadoCuentaProveedor> {
    const proveedor = await this.findOne(id);

    const compras = await this.compraRepository.find({
      where: { proveedor_id: id },
      relations: ['pagos', 'detalles', 'detalles.sku'],
      order: { fecha: 'DESC', created_at: 'DESC' },
    });

    let totalFacturado = 0;
    let totalPagado = 0;
    const comprasPendientes: any[] = [];
    const historialPagos: any[] = [];

    for (const compra of compras) {
      const totalCompra = Number(compra.total) || 0;
      totalFacturado += totalCompra;

      const pagadoCompra = (compra.pagos || []).reduce(
        (sum, p) => sum + (Number(p.monto) || 0),
        0,
      );
      totalPagado += pagadoCompra;

      const saldoPendiente = Math.max(0, totalCompra - pagadoCompra);
      (compra as any).monto_pagado = pagadoCompra;
      (compra as any).saldo_pendiente = saldoPendiente;

      if (compra.estado !== PurchaseStatus.PAGADA && saldoPendiente > 0) {
        comprasPendientes.push(compra);
      }

      if (compra.pagos) {
        historialPagos.push(...compra.pagos);
      }
    }

    historialPagos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const proveedorSummary: ProveedorSummary = {
      id: proveedor.id,
      nombre: proveedor.nombre,
      rif: proveedor.rif,
      contacto: proveedor.contacto,
      telefono: proveedor.telefono,
      email: proveedor.email,
      direccion: proveedor.direccion,
      created_at: proveedor.created_at.toISOString(),
      updated_at: proveedor.updated_at.toISOString(),
    };

    return {
      proveedor: proveedorSummary,
      total_compras: compras.length,
      total_facturado: Number(totalFacturado.toFixed(2)),
      total_pagado: Number(totalPagado.toFixed(2)),
      saldo_pendiente: Number((totalFacturado - totalPagado).toFixed(2)),
      compras_pendientes: comprasPendientes,
      historial_pagos: historialPagos,
    };
  }
}
