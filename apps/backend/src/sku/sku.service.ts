import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Sku } from '../entities/sku.entity';
import { CreateSkuDto, UpdateSkuDto, SkuFilterDto } from './dto/sku.dto';
import { PaginatedResult } from '@japonparts/shared';

@Injectable()
export class SkuService {
  constructor(
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
  ) {}

  async create(createSkuDto: CreateSkuDto): Promise<Sku> {
    const existing = await this.skuRepository.findOne({
      where: { sku_interno: createSkuDto.sku_interno.toUpperCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un SKU con el código interno '${createSkuDto.sku_interno}'`,
      );
    }

    const sku = this.skuRepository.create({
      ...createSkuDto,
      sku_interno: createSkuDto.sku_interno.toUpperCase().trim(),
    });

    return await this.skuRepository.save(sku);
  }

  async findAll(filter: SkuFilterDto): Promise<PaginatedResult<Sku>> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<Sku> = this.skuRepository
      .createQueryBuilder('sku')
      .leftJoinAndSelect('sku.compatibilidades', 'compatibilidad')
      .leftJoinAndSelect('sku.publicaciones', 'publicacion')
      .orderBy('sku.created_at', 'DESC');

    if (filter.q && filter.q.trim()) {
      const term = `%${filter.q.trim()}%`;
      qb.andWhere(
        '(sku.sku_interno ILIKE :term OR sku.nombre ILIKE :term OR sku.marca ILIKE :term OR sku.codigo_fabricante ILIKE :term)',
        { term },
      );
    }

    if (filter.marca && filter.marca.trim()) {
      qb.andWhere('sku.marca ILIKE :marca', { marca: `%${filter.marca.trim()}%` });
    }

    if (filter.activo !== undefined && filter.activo !== '') {
      const isActivo = filter.activo === 'true' || filter.activo === true;
      qb.andWhere('sku.activo = :isActivo', { isActivo });
    }

    if (filter.bajo_stock === 'true' || filter.bajo_stock === true) {
      qb.andWhere('sku.stock_actual <= sku.stock_minimo');
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Sku> {
    const sku = await this.skuRepository.findOne({
      where: { id },
      relations: ['compatibilidades', 'publicaciones', 'publicaciones.cuenta'],
    });

    if (!sku) {
      throw new NotFoundException(`SKU con ID '${id}' no encontrado`);
    }

    return sku;
  }

  async findBySkuInterno(sku_interno: string): Promise<Sku | null> {
    return await this.skuRepository.findOne({
      where: { sku_interno: sku_interno.toUpperCase().trim() },
      relations: ['compatibilidades', 'publicaciones'],
    });
  }

  async update(id: string, updateSkuDto: UpdateSkuDto): Promise<Sku> {
    const sku = await this.findOne(id);
    Object.assign(sku, updateSkuDto);
    return await this.skuRepository.save(sku);
  }

  async remove(id: string): Promise<void> {
    const sku = await this.findOne(id);
    await this.skuRepository.remove(sku);
  }
}
