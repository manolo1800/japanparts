import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publicacion } from '../entities/publicacion.entity';
import { Sku } from '../entities/sku.entity';
import { CuentaCanal } from '../entities/cuenta-canal.entity';
import { PublicacionService } from './publicacion.service';
import { PublicacionController } from './publicacion.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Publicacion, Sku, CuentaCanal]), AuthModule],
  controllers: [PublicacionController],
  providers: [PublicacionService],
  exports: [PublicacionService],
})
export class PublicacionModule {}
