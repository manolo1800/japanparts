import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { Sku } from '../entities/sku.entity';
import { MovimientoStockService } from './movimiento-stock.service';
import { MovimientoStockController } from './movimiento-stock.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoStock, Sku]), AuthModule],
  controllers: [MovimientoStockController],
  providers: [MovimientoStockService],
  exports: [MovimientoStockService],
})
export class MovimientoStockModule {}
