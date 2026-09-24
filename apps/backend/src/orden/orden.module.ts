import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orden } from '../entities/orden.entity';
import { OrdenDetalle } from '../entities/orden-detalle.entity';
import { DocumentoVenta } from '../entities/documento-venta.entity';
import { Cliente } from '../entities/cliente.entity';
import { Sku } from '../entities/sku.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { StorageModule } from '../storage/storage.module';
import { OrdenService } from './orden.service';
import { OrdenController } from './orden.controller';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Orden,
      OrdenDetalle,
      DocumentoVenta,
      Cliente,
      Sku,
      MovimientoStock,
    ]),
    StorageModule,
  ],
  controllers: [OrdenController],
  providers: [OrdenService, PdfGeneratorService],
  exports: [OrdenService, PdfGeneratorService, TypeOrmModule],
})
export class OrdenModule {}
