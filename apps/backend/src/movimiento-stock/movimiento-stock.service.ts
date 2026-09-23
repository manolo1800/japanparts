import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { Sku } from '../entities/sku.entity';
import { AjusteStockDto } from './dto/ajuste-stock.dto';
import { MovementType } from '@japonparts/shared';

@Injectable()
export class MovimientoStockService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(MovimientoStock)
    private movimientoRepository: Repository<MovimientoStock>,
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
  ) {}

  async ajustarStock(
    skuId: string,
    dto: AjusteStockDto,
    usuarioId?: string,
  ): Promise<{ sku: Sku; movimiento: MovimientoStock }> {
    return await this.dataSource.transaction(async (manager) => {
      const skuRepo = manager.getRepository(Sku);
      const movRepo = manager.getRepository(MovimientoStock);

      // Bloqueo pesimista para evitar condiciones de carrera en ventas o ajustes concurrentes
      const sku = await skuRepo.findOne({
        where: { id: skuId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sku) {
        throw new NotFoundException(`SKU con ID '${skuId}' no encontrado`);
      }

      const anteriorStock = sku.stock_actual;
      let cantidadRegistrada = dto.cantidad;

      if (dto.tipo === MovementType.ENTRADA) {
        sku.stock_actual = anteriorStock + dto.cantidad;
      } else if (dto.tipo === MovementType.SALIDA) {
        if (anteriorStock < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente. Stock actual: ${anteriorStock}, solicitado: ${dto.cantidad}`,
          );
        }
        sku.stock_actual = anteriorStock - dto.cantidad;
      } else if (dto.tipo === MovementType.AJUSTE) {
        // Ajuste directo al valor indicado en dto.cantidad
        cantidadRegistrada = dto.cantidad - anteriorStock;
        sku.stock_actual = dto.cantidad;
      }

      await skuRepo.save(sku);

      const movimiento = movRepo.create({
        sku_id: skuId,
        tipo: dto.tipo,
        cantidad: dto.tipo === MovementType.AJUSTE ? cantidadRegistrada : dto.cantidad,
        referencia_tipo: dto.referencia_tipo || 'ajuste_manual',
        referencia_id: dto.referencia_id || null,
        usuario_id: usuarioId || null,
        notas: dto.notas || `Ajuste de stock: ${anteriorStock} -> ${sku.stock_actual}`,
      });

      const guardado = await movRepo.save(movimiento);

      return {
        sku,
        movimiento: guardado,
      };
    });
  }

  async findBySku(skuId: string): Promise<MovimientoStock[]> {
    const sku = await this.skuRepository.findOne({ where: { id: skuId } });
    if (!sku) {
      throw new NotFoundException(`SKU con ID '${skuId}' no encontrado`);
    }

    return await this.movimientoRepository.find({
      where: { sku_id: skuId },
      relations: ['usuario'],
      order: { created_at: 'DESC' },
    });
  }
}
