import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from '../entities/compra.entity';
import { CompraDetalle } from '../entities/compra-detalle.entity';
import { PagoCompra } from '../entities/pago-compra.entity';
import { Sku } from '../entities/sku.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { CompraService } from './compra.service';
import { CompraController } from './compra.controller';
import { OcrService } from './ocr.service';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Compra,
      CompraDetalle,
      PagoCompra,
      Sku,
      Proveedor,
      MovimientoStock,
    ]),
    StorageModule,
    AuthModule,
  ],
  controllers: [CompraController],
  providers: [CompraService, OcrService],
  exports: [CompraService, OcrService],
})
export class CompraModule {}
