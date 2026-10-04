import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from '../entities/compra.entity';
import { CompraDetalle } from '../entities/compra-detalle.entity';
import { PagoCompra } from '../entities/pago-compra.entity';
import { Sku } from '../entities/sku.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { OrdenCompra } from '../entities/orden-compra.entity';
import { OrdenCompraDetalle } from '../entities/orden-compra-detalle.entity';
import { CompraService } from './compra.service';
import { CompraController } from './compra.controller';
import { OcrService } from './ocr.service';
import { OrdenCompraService } from './orden-compra.service';
import { OrdenCompraPdfService } from './orden-compra-pdf.service';
import { OrdenCompraController } from './orden-compra.controller';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Compra,
      CompraDetalle,
      PagoCompra,
      Sku,
      Proveedor,
      MovimientoStock,
      OrdenCompra,
      OrdenCompraDetalle,
    ]),
    StorageModule,
    AuthModule,
    IntegrationsModule,
  ],
  controllers: [CompraController, OrdenCompraController],
  providers: [
    CompraService,
    OcrService,
    OrdenCompraService,
    OrdenCompraPdfService,
  ],
  exports: [
    CompraService,
    OcrService,
    OrdenCompraService,
    OrdenCompraPdfService,
  ],
})
export class CompraModule {}
