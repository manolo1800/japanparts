import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Compatibilidad } from '../entities/compatibilidad.entity';
import { Sku } from '../entities/sku.entity';
import {
  CreateCompatibilidadDto,
  UpdateCompatibilidadDto,
  BuscarCompatibilidadDto,
} from './dto/compatibilidad.dto';

@Injectable()
export class CompatibilidadService {
  constructor(
    @InjectRepository(Compatibilidad)
    private compatibilidadRepository: Repository<Compatibilidad>,
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
  ) {}

  async create(skuId: string, dto: CreateCompatibilidadDto): Promise<Compatibilidad> {
    const sku = await this.skuRepository.findOne({ where: { id: skuId } });
    if (!sku) {
      throw new NotFoundException(`SKU con ID '${skuId}' no encontrado`);
    }

    const item = this.compatibilidadRepository.create({
      ...dto,
      sku_id: skuId,
    });

    return await this.compatibilidadRepository.save(item);
  }

  async findBySku(skuId: string): Promise<Compatibilidad[]> {
    return await this.compatibilidadRepository.find({
      where: { sku_id: skuId },
      order: { marca_vehiculo: 'ASC', modelo: 'ASC', anio_desde: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateCompatibilidadDto): Promise<Compatibilidad> {
    const item = await this.compatibilidadRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Registro de compatibilidad '${id}' no encontrado`);
    }

    Object.assign(item, dto);
    return await this.compatibilidadRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.compatibilidadRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Registro de compatibilidad '${id}' no encontrado`);
    }
    await this.compatibilidadRepository.remove(item);
  }

  /**
   * Servicio BuscarCompatibilidad(marca, modelo, año, motor)
   * Buscador inverso: ¿Qué repuestos/SKUs le sirven a este vehículo?
   */
  async buscarCompatibilidad(params: BuscarCompatibilidadDto): Promise<Compatibilidad[]> {
    const qb: SelectQueryBuilder<Compatibilidad> = this.compatibilidadRepository
      .createQueryBuilder('comp')
      .innerJoinAndSelect('comp.sku', 'sku')
      .where('sku.activo = :activo', { activo: true });

    if (params.marca_vehiculo && params.marca_vehiculo.trim()) {
      qb.andWhere('comp.marca_vehiculo ILIKE :marca', {
        marca: `%${params.marca_vehiculo.trim()}%`,
      });
    }

    if (params.modelo && params.modelo.trim()) {
      qb.andWhere('comp.modelo ILIKE :modelo', {
        modelo: `%${params.modelo.trim()}%`,
      });
    }

    if (params.anio !== undefined && !isNaN(Number(params.anio))) {
      const year = Number(params.anio);
      qb.andWhere(
        'comp.anio_desde <= :year AND (comp.anio_hasta >= :year OR comp.anio_hasta IS NULL)',
        { year },
      );
    }

    if (params.motor && params.motor.trim()) {
      qb.andWhere('(comp.motor ILIKE :motor OR comp.motor IS NULL)', {
        motor: `%${params.motor.trim()}%`,
      });
    }

    qb.orderBy('sku.stock_actual', 'DESC')
      .addOrderBy('sku.nombre', 'ASC');

    return await qb.getMany();
  }
}
