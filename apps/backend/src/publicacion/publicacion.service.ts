import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publicacion } from '../entities/publicacion.entity';
import { Sku } from '../entities/sku.entity';
import { CreatePublicacionDto, UpdatePublicacionDto } from './dto/publicacion.dto';
import { Channel } from '@japonparts/shared';

@Injectable()
export class PublicacionService {
  constructor(
    @InjectRepository(Publicacion)
    private publicacionRepository: Repository<Publicacion>,
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
  ) {}

  async create(dto: CreatePublicacionDto): Promise<Publicacion> {
    const sku = await this.skuRepository.findOne({ where: { id: dto.sku_id } });
    if (!sku) {
      throw new NotFoundException(`SKU con ID '${dto.sku_id}' no encontrado`);
    }

    const publicacion = this.publicacionRepository.create(dto);
    return await this.publicacionRepository.save(publicacion);
  }

  async findAll(canal?: Channel, skuId?: string): Promise<Publicacion[]> {
    const qb = this.publicacionRepository
      .createQueryBuilder('pub')
      .leftJoinAndSelect('pub.sku', 'sku')
      .leftJoinAndSelect('pub.cuenta', 'cuenta')
      .orderBy('pub.created_at', 'DESC');

    if (canal) {
      qb.andWhere('pub.canal = :canal', { canal });
    }

    if (skuId) {
      qb.andWhere('pub.sku_id = :skuId', { skuId });
    }

    return await qb.getMany();
  }

  async findBySku(skuId: string): Promise<Publicacion[]> {
    return await this.publicacionRepository.find({
      where: { sku_id: skuId },
      relations: ['cuenta'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Publicacion> {
    const pub = await this.publicacionRepository.findOne({
      where: { id },
      relations: ['sku', 'cuenta'],
    });

    if (!pub) {
      throw new NotFoundException(`Publicación con ID '${id}' no encontrada`);
    }

    return pub;
  }

  async update(id: string, dto: UpdatePublicacionDto): Promise<Publicacion> {
    const pub = await this.findOne(id);
    Object.assign(pub, dto);
    return await this.publicacionRepository.save(pub);
  }

  async remove(id: string): Promise<void> {
    const pub = await this.findOne(id);
    await this.publicacionRepository.remove(pub);
  }
}
