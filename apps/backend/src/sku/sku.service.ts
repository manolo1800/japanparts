import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Sku } from '../entities/sku.entity';
import { CreateSkuDto, UpdateSkuDto, SkuFilterDto } from './dto/sku.dto';
import { PaginatedResult, SugerirPrecioPayload, SugerirPrecioResponse } from '@japonparts/shared';
import { DeepSeekService } from '../integrations/deepseek/deepseek.service';

@Injectable()
export class SkuService {
  constructor(
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
    private readonly deepSeekService: DeepSeekService,
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

    if (updateSkuDto.sku_interno) {
      const formattedSku = updateSkuDto.sku_interno.toUpperCase().trim();
      if (formattedSku !== sku.sku_interno) {
        const existing = await this.skuRepository.findOne({
          where: { sku_interno: formattedSku },
        });

        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Ya existe un SKU con el código interno '${updateSkuDto.sku_interno}'`,
          );
        }
        sku.sku_interno = formattedSku;
      }
    }

    if (updateSkuDto.nombre !== undefined) {
      sku.nombre = updateSkuDto.nombre.trim();
    }
    if (updateSkuDto.marca !== undefined) {
      sku.marca = updateSkuDto.marca.trim();
    }
    if (updateSkuDto.codigo_fabricante !== undefined) {
      sku.codigo_fabricante = updateSkuDto.codigo_fabricante ? updateSkuDto.codigo_fabricante.trim() : null;
    }
    if (updateSkuDto.descripcion !== undefined) {
      sku.descripcion = updateSkuDto.descripcion ? updateSkuDto.descripcion.trim() : null;
    }
    if (updateSkuDto.costo_promedio !== undefined) {
      sku.costo_promedio = Number(updateSkuDto.costo_promedio);
    }
    if (updateSkuDto.precio_base !== undefined) {
      sku.precio_base = Number(updateSkuDto.precio_base);
    }
    if (updateSkuDto.stock_actual !== undefined) {
      sku.stock_actual = Number(updateSkuDto.stock_actual);
    }
    if (updateSkuDto.stock_minimo !== undefined) {
      sku.stock_minimo = Number(updateSkuDto.stock_minimo);
    }
    if (updateSkuDto.ubicacion !== undefined) {
      sku.ubicacion = updateSkuDto.ubicacion ? updateSkuDto.ubicacion.trim() : null;
    }
    if (updateSkuDto.activo !== undefined) {
      sku.activo = Boolean(updateSkuDto.activo);
    }

    return await this.skuRepository.save(sku);
  }

  async remove(id: string): Promise<void> {
    const sku = await this.findOne(id);
    await this.skuRepository.remove(sku);
  }

  async sugerirPrecio(
    id: string,
    payload?: SugerirPrecioPayload,
  ): Promise<SugerirPrecioResponse> {
    const sku = await this.findOne(id);

    return await this.deepSeekService.sugerirPrecio(
      {
        id: sku.id,
        sku_interno: sku.sku_interno,
        nombre: sku.nombre,
        marca: sku.marca,
        costo_promedio: Number(sku.costo_promedio) || 0,
        precio_base: Number(sku.precio_base) || 0,
        stock_actual: Number(sku.stock_actual) || 0,
        descripcion: sku.descripcion,
      },
      payload?.margen_objetivo_pct,
      payload?.notas_adicionales,
    );
  }
}
