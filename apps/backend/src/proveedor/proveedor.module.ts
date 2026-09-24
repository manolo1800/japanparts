import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proveedor } from '../entities/proveedor.entity';
import { Compra } from '../entities/compra.entity';
import { PagoCompra } from '../entities/pago-compra.entity';
import { ProveedorService } from './proveedor.service';
import { ProveedorController } from './proveedor.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Proveedor, Compra, PagoCompra]), AuthModule],
  controllers: [ProveedorController],
  providers: [ProveedorService],
  exports: [ProveedorService],
})
export class ProveedorModule {}
